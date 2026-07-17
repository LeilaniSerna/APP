import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  email = '';
  password = '';
  isScanning = false;

  constructor(private router: Router, private authService: AuthService) {}

  handleTraditionalLogin() {
    if (!this.email || !this.password) {
      alert('Por favor, ingresa tu correo electrónico y contraseña');
      return;
    }

    // Llamar al servicio de autenticación conectado con la base de datos MongoDB
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        console.log('Inicio de sesión exitoso:', res);
        this.router.navigate(['/tabs/home']);
      },
      error: (err) => {
        console.error('Error de autenticación:', err);
        const errorMsg = err.error?.error || 'Error al conectar con el servidor de base de datos';
        alert(errorMsg);
      }
    });
  }

  handleBiometricLogin() {
    this.isScanning = true;
    setTimeout(() => {
      this.isScanning = false;
      
      // Simular credenciales biométricas guardando un token ficticio en localStorage
      // de manera que el authGuard de Angular le permita acceder
      localStorage.setItem('token', 'simulated-biometric-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'biometric-mock',
        nombre: 'Doctor Biométrico (Acceso Facial)',
        email: 'biometric@assistive.com',
        rol: 'usuario'
      }));

      console.log('Autenticación facial completada (Simulado)');
      this.router.navigate(['/tabs/home']);
    }, 3000);
  }
}