import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  email = 'medico@assistive.com';
  password = '12345';
  isScanning = false;

  constructor(private router: Router) {}

  handleTraditionalLogin() {
    if (this.email === 'medico@assistive.com' && this.password === '12345') {
      this.router.navigate(['/tabs/home']);
    } else {
      alert('Credenciales incorrectas');
    }
  }

  handleBiometricLogin() {
    this.isScanning = true;
    setTimeout(() => {
      this.isScanning = false;
      this.router.navigate(['/tabs/home']);
    }, 3000);
  }
}