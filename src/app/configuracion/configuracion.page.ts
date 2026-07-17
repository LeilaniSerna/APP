import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.page.html',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ConfiguracionPage {
  forceValue = 60;

  constructor(private router: Router, private authService: AuthService) {}

  get forceLabel() {
    if(this.forceValue < 35) return `${this.forceValue}% (Ultra Delicado)`;
    if(this.forceValue < 70) return `${this.forceValue}% (Normal)`;
    return `${this.forceValue}% (Fuerte)`;
  }

  handleLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}