import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { LanguageService } from './language.service';

// IP del ESP32 en la red local
const ESP32_URL = 'http://192.168.100.52';


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

export interface LogMessage {
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error' | 'esp32';
  parametros?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition: any = null;
  private isListening = false;

  // Estado observable para los componentes de la interfaz
  status$ = new BehaviorSubject<VoiceStatus>('idle');
  lastCommand$ = new BehaviorSubject<string>('');
  statusMessage$ = new BehaviorSubject<string>('Presiona el micrófono para hablar');
  log$ = new Subject<LogMessage>();

  private emitLog(mensaje: string, tipo: 'info' | 'success' | 'warning' | 'error' | 'esp32' = 'info', parametros?: Record<string, string>) {
    this.log$.next({ mensaje, tipo, parametros });
  }

  private http = inject(HttpClient);
  private langService = inject(LanguageService);

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.setStatus('error', this.langService.translate('NAVEGADOR_NO_SOPORTADO'));
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-MX';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = async (event: any) => {
      const texto = event.results[0][0].transcript;
      this.setStatus('processing', this.langService.translate('PROCESANDO_IA').replace('{texto}', texto));
      await this.sendToIABackend(texto);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      if (event.error === 'no-speech') {
        this.setStatus('unknown', this.langService.translate('NO_VOZ'));
      } else {
        this.setStatus('error', this.langService.translate('ERROR_MIC').replace('{error}', event.error));
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
      this.setStatus('idle', this.langService.translate('PRESIONA_MIC'));
    } else {
      this.recognition.start();
      this.isListening = true;
      this.setStatus('listening', this.langService.translate('ESCUCHANDO'));
    }
  }

  get listening() {
    return this.isListening;
  }

  // Enviar el texto reconocido al backend de Inteligencia Artificial (ONNX CNN)
  private async sendToIABackend(texto: string) {
    try {
      const normalizedText = (texto || '').toLowerCase().trim();

      // Interceptar comandos especiales (bypass de la IA)
      if (normalizedText.includes('reposo') || normalizedText.includes('reposar')) {
        const cmd = 'REPOSO';
        this.lastCommand$.next(cmd);
        this.setStatus('success', this.langService.translate('COMANDO_DIRECTO').replace('{cmd}', cmd));
        await this.sendToEsp32(cmd.toLowerCase());
        return;
      }

      if (normalizedText.includes('prueba') || normalizedText.includes('probar')) {
        const cmd = 'PRUEBA';
        this.lastCommand$.next(cmd);
        this.setStatus('success', this.langService.translate('COMANDO_DIRECTO').replace('{cmd}', cmd));
        await this.sendToEsp32(cmd.toLowerCase());
        return;
      }

      const response: IAResponse = await firstValueFrom(
        this.http.post<IAResponse>(IA_BACKEND_URL, { texto })
      );

      const command = (response.command || '').toLowerCase();
      const confidence = response.confidence !== undefined ? response.confidence : 1.0;

      // Validar si el comando es desconocido o si el porcentaje de confianza es menor a 65%
      if (command === 'desconocido' || confidence < 0.65) {
        const pct = Math.round(confidence * 100);
        this.setStatus('unknown', this.langService.translate('BAJA_CERTEZA').replace('{pct}', pct.toString()));
        return;
      }

      const upperCmd = command.toUpperCase();
      const pctChar = Math.round(confidence * 100);

      this.lastCommand$.next(upperCmd);
      this.setStatus('success', this.langService.translate('IA_EXITO').replace('{pct}', pctChar.toString()).replace('{cmd}', upperCmd));

      // Enviar orden al ESP32 si está encendido
      await this.sendToEsp32(command);

    } catch (err) {
      console.error('Error conectando con la API de IA:', err);
      this.setStatus('error', this.langService.translate('ERROR_CONEXION_IA'));
    }
  }

  // Enviar comando al ESP32
  async sendToEsp32(comando: string) {
    try {
      this.emitLog('LOG_ESP32_ENVIANDO', 'info', { cmd: comando.toUpperCase(), url: ESP32_URL });
      await firstValueFrom(
        this.http.post(`${ESP32_URL}/comando`, { comando }, { responseType: 'text' })
      );
      this.emitLog('LOG_ESP32_EXITO', 'success', { cmd: comando.toUpperCase() });
    } catch (err) {
      // El ESP32 puede estar apagado — notificamos sin interrumpir el flujo visual
      this.emitLog('LOG_ESP32_ERROR', 'error');
      this.setStatus('error', this.langService.translate('ERROR_ENVIO_BRAZO').replace('{cmd}', comando.toUpperCase()));
    }
  }

  private setStatus(status: VoiceStatus, message: string) {
    this.status$.next(status);
    this.statusMessage$.next(message);
  }
}