import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

// IP del ESP32 en la red local — cambia esto cuando tengas la IP real
const ESP32_URL = 'http://192.168.1.100';

// Endpoint del backend en Vercel
const VERCEL_URL = 'https://brazo-backend.vercel.app/api/comando';

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'success'
  | 'unknown'
  | 'error';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition: any = null;
  private isListening = false;

  // Estado observable para que el componente lo muestre
  status$ = new BehaviorSubject<VoiceStatus>('idle');
  lastCommand$ = new BehaviorSubject<string>('');
  statusMessage$ = new BehaviorSubject<string>('Presiona el micrófono para hablar');

  constructor(private http: HttpClient) {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.setStatus('error', 'Tu navegador no soporta reconocimiento de voz. Usa Chrome.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-MX';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = async (event: any) => {
      const texto = event.results[0][0].transcript;
      this.setStatus('processing', `Escuché: "${texto}" — procesando...`);
      await this.sendToVercel(texto);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      if (event.error === 'no-speech') {
        this.setStatus('unknown', 'No se detectó voz, intenta de nuevo');
      } else {
        this.setStatus('error', `Error de micrófono: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  toggleListening() {
    if (!this.recognition) return;

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.setStatus('idle', 'Presiona el micrófono para hablar');
    } else {
      this.recognition.start();
      this.isListening = true;
      this.setStatus('listening', 'Escuchando... habla ahora');
    }
  }

  get listening() {
    return this.isListening;
  }

  private async sendToVercel(texto: string) {
    try {
      const response: any = await firstValueFrom(
        this.http.post(VERCEL_URL, { texto })
      );

      if (response.command === 'desconocido') {
        this.setStatus('unknown', 'No entendí el comando, intenta de nuevo');
        return;
      }

      this.lastCommand$.next(response.command.toUpperCase());
      this.setStatus('success', `Comando: ${response.command.toUpperCase()}`);
      await this.sendToEsp32(response.command);

    } catch (err) {
      this.setStatus('error', 'Error al contactar el servidor, verifica tu conexión');
    }
  }

  private async sendToEsp32(comando: string) {
    try {
      await firstValueFrom(
        this.http.post(`${ESP32_URL}/comando`, { comando }, { responseType: 'text' })
      );
    } catch (err) {
      // El ESP32 puede estar apagado — no rompemos la app, solo avisamos
      this.setStatus('error', `Comando reconocido (${comando.toUpperCase()}) pero el brazo no respondió. ¿Está encendido?`);
    }
  }

  private setStatus(status: VoiceStatus, message: string) {
    this.status$.next(status);
    this.statusMessage$.next(message);
  }
}