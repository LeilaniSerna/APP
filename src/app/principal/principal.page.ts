import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { VoiceService, VoiceStatus } from '../services/voice';
import { addIcons } from 'ionicons';
import { mic, micOutline } from 'ionicons/icons';
import {
  IonContent,
  IonFabButton,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: './principal.page.html',
  standalone: true,
  imports: [CommonModule, IonContent, IonFabButton, IonIcon],
})
export class HomePage implements OnDestroy {
  robotState = 'EN REPOSO';
  robotColor = 'text-brandLight';
  voltage = 'Consumo: 0.1A';

  arm1 = 'rotate(-45deg)';
  arm2 = 'rotate(70deg)';
  gripT = 'translateY(0px)';
  gripB = 'translateY(0px)';
  glassOp = 'opacity-100';

  voiceStatus: VoiceStatus = 'idle';
  statusMessage = 'Presiona el micrófono para hablar';

  private subs = new Subscription();

  constructor(public voiceService: VoiceService) {
    addIcons({ mic, micOutline });
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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

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
    switch (cmd) {
      case 'ABRIR':
        this.robotState = 'GARRA ABIERTA';
        this.robotColor = 'text-brandLight';
        this.gripT = 'translateY(-4px)';
        this.gripB = 'translateY(4px)';
        this.glassOp = 'opacity-0';
        this.voltage = 'Consumo: 0.8A';
        break;
      case 'CERRAR':
        this.robotState = 'VASO SUJETO';
        this.robotColor = 'text-brandLight';
        this.gripT = 'translateY(0px)';
        this.gripB = 'translateY(0px)';
        this.glassOp = 'opacity-100';
        this.voltage = 'Consumo: 1.2A';
        break;
      case 'ARRIBA':
        this.robotState = 'ELEVANDO...';
        this.robotColor = 'text-amber-500';
        this.voltage = 'Consumo: 1.8A';
        this.arm1 = 'rotate(-20deg)';
        this.arm2 = 'rotate(30deg)';
        setTimeout(() => {
          this.robotState = 'POSICIÓN ALTA';
          this.robotColor = 'text-brandLight';
        }, 1200);
        break;
      case 'ABAJO':
        this.robotState = 'DESCENDIENDO...';
        this.robotColor = 'text-amber-500';
        this.arm1 = 'rotate(-45deg)';
        this.arm2 = 'rotate(70deg)';
        this.voltage = 'Consumo: 1.5A';
        setTimeout(() => {
          this.robotState = 'EN BASE';
          this.robotColor = 'text-brandLight';
          this.voltage = 'Consumo: 0.1A';
        }, 1200);
        break;
      case 'IZQUIERDA':
        this.robotState = 'GIRANDO IZQ...';
        this.robotColor = 'text-amber-500';
        this.voltage = 'Consumo: 1.3A';
        setTimeout(() => {
          this.robotState = 'POSICIÓN IZQ';
          this.robotColor = 'text-brandLight';
        }, 1000);
        break;
      case 'DERECHA':
        this.robotState = 'GIRANDO DER...';
        this.robotColor = 'text-amber-500';
        this.voltage = 'Consumo: 1.3A';
        setTimeout(() => {
          this.robotState = 'POSICIÓN DER';
          this.robotColor = 'text-brandLight';
        }, 1000);
        break;
      case 'ALTO':
        this.robotState = 'DETENIDO';
        this.robotColor = 'text-red-400';
        this.voltage = 'Consumo: 0.1A';
        break;
    }
  }

  simulateVoice(cmd: string) {
    this.applyCommand(cmd);
  }
}