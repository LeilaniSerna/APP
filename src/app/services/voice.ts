import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

// IP del ESP32 en la red local
const ESP32_URL = 'http://192.168.100.52';

// URL Pública de la API del Backend de IA en Vercel (Modelo ONNX CNN)
const IA_BACKEND_URL = 'https://brazo-backend.vercel.app/api/comando';

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'success'
  | 'unknown'
  | 'error';

export interface IAResponse {
  command: string;
  confidence?: number;
  method?: string;
  probabilities?: Record<string, number>;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition: any = null;
  private isListening = false;

  // Estado observable para los componentes de la interfaz
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
      this.setStatus('error', 'Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-MX';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = async (event: any) => {
      const texto = event.results[0][0].transcript;
      this.setStatus('processing', `Escuché: "${texto}" — procesando con la IA...`);
      await this.sendToIABackend(texto);
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

  // Enviar el texto reconocido al backend de Inteligencia Artificial (ONNX CNN)
  private async sendToIABackend(texto: string) {
    try {
      const response: IAResponse = await firstValueFrom(
        this.http.post<IAResponse>(IA_BACKEND_URL, { texto })
      );

      const command = (response.command || '').toLowerCase();
      const confidence = response.confidence !== undefined ? response.confidence : 1.0;

      // Validar si el comando es desconocido o si el porcentaje de confianza es menor a 65%
      if (command === 'desconocido' || confidence < 0.65) {
        const pct = Math.round(confidence * 100);
        this.setStatus('unknown', `Comando no reconocido con certeza suficiente (${pct}%). Intenta de nuevo.`);
        return;
      }

      const upperCmd = command.toUpperCase();
      const pctChar = Math.round(confidence * 100);

      this.lastCommand$.next(upperCmd);
      this.setStatus('success', `IA (${pctChar}% certeza): ${upperCmd}`);

      // Enviar orden al ESP32 si está encendido
      await this.sendToEsp32(command);

    } catch (err) {
      console.error('Error conectando con la API de IA:', err);
      this.setStatus('error', 'Error al contactar el servidor de IA. Verifica tu conexión.');
    }
  }

  // Enviar comando al ESP32
  async sendToEsp32(comando: string) {
    try {
      await firstValueFrom(
        this.http.post(`${ESP32_URL}/comando`, { comando }, { responseType: 'text' })
      );
    } catch (err) {
      // El ESP32 puede estar apagado — notificamos sin interrumpir el flujo visual
      this.setStatus('error', `No se pudo enviar el comando (${comando.toUpperCase()}) al brazo. ¿Está encendido?`);
    }
  }

  private setStatus(status: VoiceStatus, message: string) {
    this.status$.next(status);
    this.statusMessage$.next(message);
  }
}