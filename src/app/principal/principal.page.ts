import { Component, OnDestroy, AfterViewInit, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { VoiceService, VoiceStatus } from '../services/voice';
import { RoutineService, Routine } from '../services/routine.service';
import { addIcons } from 'ionicons';
import { mic, micOutline, optionsOutline, addOutline, closeOutline, backspaceOutline } from 'ionicons/icons';
import {
  IonContent,
  IonHeader,
  IonFooter,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
} from '@ionic/angular/standalone';

declare const Chart: any;

@Component({
  selector: 'app-principal',
  templateUrl: './principal.page.html',
  styleUrls: ['./principal.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonFooter,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonModal,
  ],
})
export class HomePage implements OnInit, OnDestroy, AfterViewInit {
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

  // Gestor de Rutinas
  rutinas: Routine[] = [];
  ejecutandoRutina = false;
  rutinaEnEjecucionId: string | null = null;
  pasoActivoIndex = -1;
  pasosCompletados: boolean[] = [];
  progresoActual = 0;

  // Estado del Modal de Creación de Rutinas
  isModalOpen = false;
  nuevaRutinaTitulo = '';
  nuevaRutinaCategoria = 'PERSONALIZADA';
  nuevaRutinaComandos: string[] = [];
  guardandoRutina = false;

  // Comandos válidos disponibles
  comandosDisponibles = ['abrir', 'cerrar', 'subir', 'bajar', 'izquierda', 'derecha'];

  // Toast Notificaciones
  showToast = false;
  toastMessage = '';

  private subs = new Subscription();

  constructor(
    public voiceService: VoiceService,
    private routineService: RoutineService,
    private router: Router
  ) {
    addIcons({ mic, micOutline, optionsOutline, addOutline, closeOutline, backspaceOutline });

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

  ngOnInit() {
    this.cargarRutinas();
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

  // --- NAVEGACIÓN Y VISTAS ---
  switchView(view: 'monitor' | 'rutinas') {
    this.currentView = view;
    if (view === 'rutinas' && this.rutinas.length === 0) {
      this.cargarRutinas();
    }
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

  // --- MÉTODOS DEL MODAL DE CREACIÓN DE RUTINAS ---
  abrirModalCrear() {
    this.nuevaRutinaTitulo = '';
    this.nuevaRutinaCategoria = 'PERSONALIZADA';
    this.nuevaRutinaComandos = [];
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
    this.guardandoRutina = false;
  }

  agregarComandoAFormulario(cmd: string) {
    this.nuevaRutinaComandos.push(cmd.toLowerCase());
  }

  borrarUltimoComando() {
    if (this.nuevaRutinaComandos.length > 0) {
      this.nuevaRutinaComandos.pop();
    }
  }

  guardarNuevaRutina() {
    if (!this.nuevaRutinaTitulo.trim()) {
      this.mostrarToast('Ingresa un título para la rutina');
      return;
    }
    if (this.nuevaRutinaComandos.length === 0) {
      this.mostrarToast('Agrega al menos un comando a la secuencia');
      return;
    }

    this.guardandoRutina = true;

    const nuevaRutinaObj: Routine = {
      titulo: this.nuevaRutinaTitulo.trim(),
      categoria: this.nuevaRutinaCategoria,
      comandos: this.nuevaRutinaComandos
    };

    this.routineService.createRoutine(nuevaRutinaObj).subscribe({
      next: () => {
        this.mostrarToast('¡Rutina creada y guardada!');
        this.cerrarModal();
        this.cargarRutinas();
      },
      error: (err) => {
        console.error('Error al guardar la rutina:', err);
        const rutinaBackup: Routine = {
          _id: `custom-${Date.now()}`,
          ...nuevaRutinaObj
        };
        this.rutinas.unshift(rutinaBackup);
        this.mostrarToast('Rutina agregada localmente');
        this.cerrarModal();
      }
    });
  }

  cargarRutinas() {
    this.routineService.getRoutines().subscribe({
      next: (data) => {
        this.rutinas = data;
      },
      error: (err) => {
        console.error('Error al cargar rutinas:', err);
        this.rutinas = [
          {
            _id: 'default-1',
            titulo: 'Acercar Medicamento',
            categoria: 'ASISTENCIA MÉDICA',
            comandos: ['abrir', 'derecha', 'bajar', 'cerrar', 'arriba', 'izquierda']
          },
          {
            _id: 'default-2',
            titulo: 'Ensamblaje de Pieza',
            categoria: 'USO INDUSTRIAL',
            comandos: ['bajar', 'cerrar', 'arriba', 'derecha', 'abajo', 'abrir']
          }
        ];
      }
    });
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

  mostrarToast(mensaje: string) {
    this.toastMessage = mensaje;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 2500);
  }

  // --- GESTOR DE RUTINAS ---
  async ejecutarRutina(rutina: Routine) {
    if (this.ejecutandoRutina) {
      this.mostrarToast('Ya hay una rutina en ejecución');
      return;
    }

    this.ejecutandoRutina = true;
    this.rutinaEnEjecucionId = rutina._id || rutina.titulo;
    this.pasosCompletados = new Array(rutina.comandos.length).fill(false);
    this.progresoActual = 0;

    for (let i = 0; i < rutina.comandos.length; i++) {
      const comando = rutina.comandos[i];
      this.pasoActivoIndex = i;
      this.progresoActual = ((i + 1) / rutina.comandos.length) * 100;

      this.simulateVoice(comando.toUpperCase());

      await new Promise((r) => setTimeout(r, 1500));

      this.pasosCompletados[i] = true;
    }

    this.mostrarToast('Rutina completada con éxito');
    this.ejecutandoRutina = false;
    this.rutinaEnEjecucionId = null;
    this.pasoActivoIndex = -1;

    setTimeout(() => {
      this.progresoActual = 0;
      this.pasosCompletados = [];
    }, 3000);
  }

  getCategoriaBadgeClass(categoria: string): string {
    const cat = (categoria || '').toUpperCase();
    if (cat.includes('MÉDICA') || cat.includes('MEDICA')) {
      return 'bg-blue-500/20 text-blue-400';
    } else if (cat.includes('INDUSTRIAL')) {
      return 'bg-yellow-500/20 text-yellow-500';
    }
    return 'bg-accentWine/20 text-accentWine';
  }

  // --- CONTROL DE VOZ Y SIMULADOR ---
  toggleMic() {
    this.voiceService.toggleListening();
  }

  get micIcon(): string {
    return this.voiceService.listening ? 'mic' : 'mic-outline';
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