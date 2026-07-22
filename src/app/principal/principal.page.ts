import { Component, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { VoiceService, VoiceStatus } from '../services/voice';
import { addIcons } from 'ionicons';
import { mic, micOutline, optionsOutline } from 'ionicons/icons';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonFabButton,
} from '@ionic/angular/standalone';

declare const Chart: any;

@Component({
  selector: 'app-home',
  templateUrl: './principal.page.html',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonFabButton
  ],
})
export class HomePage implements OnDestroy, AfterViewInit {
  @ViewChild('telemetriaCanvas') telemetriaCanvas!: ElementRef<HTMLCanvasElement>;

  // Control de Vistas (Monitor vs Rutinas)
  currentView: 'monitor' | 'rutinas' = 'monitor';

  // Estado del robot
  robotState = 'POSICIÓN DER';
  robotColor = 'text-accentWine';
  voltage = 'Consumo: 1.30A';

  // Ángulos del simulador del brazo SVG
  arm1 = 'rotate(-45deg)';
  arm2 = 'rotate(70deg)';
  gripT = 'translateY(0px)';
  gripB = 'translateY(0px)';
  glassOp = 'opacity-100';

  // Control de voz
  voiceStatus: VoiceStatus = 'idle';
  statusMessage = 'Presiona el micrófono para hablar';

  // Telemetría Chart.js
  telemetriaChart: any = null;
  consumoData = [0.2, 0.3, 0.2, 0.4, 0.3, 0.2, 0.2];
  private telemetriaInterval: any = null;

  // Gestor de Rutinas (Mocks)
  ejecutandoRutina = false;
  pasosRutina1 = ['abrir', 'derecha', 'bajar', 'cerrar', 'arriba', 'izquierda'];
  pasosRutina2 = ['bajar', 'cerrar', 'arriba', 'derecha', 'abajo', 'abrir'];
  
  pasoActivoRutina1 = -1;
  pasoActivoRutina2 = -1;
  pasoCompletadoRutina1: boolean[] = [false, false, false, false, false, false];
  pasoCompletadoRutina2: boolean[] = [false, false, false, false, false, false];
  
  progresoRutina1 = 0;
  progresoRutina2 = 0;

  // Toast Notificaciones
  showToast = false;
  toastMessage = '';

  private subs = new Subscription();

  constructor(public voiceService: VoiceService, private router: Router) {
    addIcons({ mic, micOutline, optionsOutline });

    this.subs.add(
      this.voiceService.status$.subscribe((s) => (this.voiceStatus = s))
    );
    this.subs.add(
      this.voiceService.statusMessage$.subscribe((m) => (this.statusMessage = m))
    );
    this.subs.add(
      this.voiceService.lastCommand$.subscribe((cmd) => {
        if (cmd) this.applyCommand(cmd);
      })
    );
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initChart();
      this.startTelemetriaLoop();
    }, 300);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.telemetriaInterval) {
      clearInterval(this.telemetriaInterval);
    }
  }

  // --- NAVEGACIÓN ---
  switchView(view: 'monitor' | 'rutinas') {
    this.currentView = view;
    if (view === 'monitor') {
      setTimeout(() => {
        if (!this.telemetriaChart) {
          this.initChart();
        }
      }, 100);
    }
  }

  goToConfiguracion() {
    this.router.navigate(['/configuracion']);
  }

  // --- TELEMETRÍA (CHART.JS) ---
  initChart() {
    const canvas = document.getElementById('telemetriaChart') as HTMLCanvasElement;
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.telemetriaChart) {
      this.telemetriaChart.destroy();
    }

    this.telemetriaChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['-6s', '-5s', '-4s', '-3s', '-2s', '-1s', 'Ahora'],
        datasets: [{
          label: 'Amperaje (A)',
          data: this.consumoData,
          borderColor: '#a83250',
          backgroundColor: 'rgba(168, 50, 80, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { display: true, min: 0, max: 3.5, grid: { color: '#374151', drawBorder: false } },
          x: { display: true, grid: { display: false } }
        },
        animation: { duration: 400 }
      }
    });
  }

  registrarConsumo(pico: number) {
    this.consumoData.shift();
    const nuevoValor = pico + (Math.random() * 0.4 - 0.2);
    const valorFinal = Math.max(0.1, nuevoValor);
    this.consumoData.push(valorFinal);

    if (this.telemetriaChart) {
      this.telemetriaChart.update();
    }
    this.voltage = `Consumo: ${valorFinal.toFixed(2)}A`;
  }

  private startTelemetriaLoop() {
    this.telemetriaInterval = setInterval(() => {
      if (!this.ejecutandoRutina) {
        this.registrarConsumo(0.2);
      }
    }, 2000);
  }

  // --- SISTEMA TOAST ---
  mostrarToast(mensaje: string) {
    this.toastMessage = mensaje;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 2500);
  }

  // --- GESTOR DE RUTINAS ---
  async ejecutarRutina(idRutina: 'rutina1' | 'rutina2', pasos: string[]) {
    if (this.ejecutandoRutina) {
      this.mostrarToast('Ya hay una rutina en ejecución');
      return;
    }

    this.ejecutandoRutina = true;

    if (idRutina === 'rutina1') {
      this.progresoRutina1 = 0;
      this.pasoCompletadoRutina1 = [false, false, false, false, false, false];
    } else {
      this.progresoRutina2 = 0;
      this.pasoCompletadoRutina2 = [false, false, false, false, false, false];
    }

    for (let i = 0; i < pasos.length; i++) {
      const comando = pasos[i];

      if (idRutina === 'rutina1') {
        this.pasoActivoRutina1 = i;
        this.progresoRutina1 = ((i + 1) / pasos.length) * 100;
      } else {
        this.pasoActivoRutina2 = i;
        this.progresoRutina2 = ((i + 1) / pasos.length) * 100;
      }

      this.simulateVoice(comando.toUpperCase());

      await new Promise((r) => setTimeout(r, 1500));

      if (idRutina === 'rutina1') {
        this.pasoCompletadoRutina1[i] = true;
      } else {
        this.pasoCompletadoRutina2[i] = true;
      }
    }

    this.mostrarToast('Rutina completada con éxito');
    this.ejecutandoRutina = false;
    this.pasoActivoRutina1 = -1;
    this.pasoActivoRutina2 = -1;

    setTimeout(() => {
      if (idRutina === 'rutina1') {
        this.progresoRutina1 = 0;
        this.pasoCompletadoRutina1 = [false, false, false, false, false, false];
      } else {
        this.progresoRutina2 = 0;
        this.pasoCompletadoRutina2 = [false, false, false, false, false, false];
      }
    }, 3000);
  }

  // --- CONTROL DE VOZ Y SIMULADOR DEL BRAZO ---
  toggleMic() {
    this.voiceService.toggleListening();
  }

  get micIcon(): string {
    return this.voiceService.listening ? 'mic' : 'mic-outline';
  }

  get micColor(): string {
    switch (this.voiceStatus) {
      case 'listening':  return 'danger';
      case 'processing': return 'warning';
      case 'success':    return 'success';
      case 'error':      return 'medium';
      case 'unknown':    return 'warning';
      default:           return 'primary';
    }
  }

  applyCommand(cmd: string) {
    const upperCmd = cmd.toUpperCase();
    this.robotState = `Ejecutando: ${upperCmd}`;
    this.robotColor = 'text-accentWine';
    this.registrarConsumo(2.5);

    switch (upperCmd) {
      case 'ABRIR':
        this.gripT = 'translateY(-4px)';
        this.gripB = 'translateY(4px)';
        this.glassOp = 'opacity-0';
        break;
      case 'CERRAR':
        this.gripT = 'translateY(0px)';
        this.gripB = 'translateY(0px)';
        this.glassOp = 'opacity-100';
        break;
      case 'ARRIBA':
      case 'SUBIR':
        this.arm1 = 'rotate(-20deg)';
        this.arm2 = 'rotate(30deg)';
        break;
      case 'ABAJO':
      case 'BAJAR':
        this.arm1 = 'rotate(-45deg)';
        this.arm2 = 'rotate(70deg)';
        break;
      case 'IZQUIERDA':
        this.arm1 = 'rotate(-60deg)';
        break;
      case 'DERECHA':
        this.arm1 = 'rotate(-30deg)';
        break;
      case 'ALTO':
        this.robotState = 'DETENIDO';
        this.robotColor = 'text-red-400';
        break;
    }

    setTimeout(() => {
      if (this.robotState !== 'DETENIDO') {
        this.robotState = 'EN ESPERA';
        this.registrarConsumo(0.2);
      }
    }, 1000);
  }

  simulateVoice(cmd: string) {
    this.applyCommand(cmd);
  }
}