import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth';
import { addIcons } from 'ionicons';
import {
  personOutline,
  cameraOutline,
  callOutline,
  hardwareChipOutline,
  logOutOutline,
  saveOutline,
  checkmarkCircleOutline,
  arrowBackOutline
} from 'ionicons/icons';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonIcon
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.page.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonIcon
  ]
})
export class ConfiguracionPage implements OnInit {
  usuario: User | null = null;
  
  // Datos de Perfil de Usuario
  nombre = '';
  email = '';
  rol = 'usuario';
  especialidad = 'Especialista en Robótica Clínica';
  avatarUrl = '';

  // Contacto de Emergencia
  contactoNombre = '';
  contactoTelefono = '';
  contactoRelacion = 'Médico de Guardia';

  // Configuración del Brazo
  forceValue = 60;

  // Estado de guardado
  saveSuccess = false;

  constructor(private router: Router, private authService: AuthService) {
    addIcons({
      personOutline,
      cameraOutline,
      callOutline,
      hardwareChipOutline,
      logOutOutline,
      saveOutline,
      checkmarkCircleOutline,
      arrowBackOutline
    });
  }

  ngOnInit() {
    this.cargarPerfil();
  }

  cargarPerfil() {
    this.usuario = this.authService.getCurrentUser();
    if (this.usuario) {
      this.nombre = this.usuario.nombre || 'Usuario A-ARM';
      this.email = this.usuario.email || '';
      this.rol = this.usuario.rol || 'usuario';
    }

    // Cargar perfil extendido guardado localmente si existe
    const perfilGuardado = localStorage.getItem('user_profile_extended');
    if (perfilGuardado) {
      try {
        const datos = JSON.parse(perfilGuardado);
        if (datos.nombre) this.nombre = datos.nombre;
        if (datos.especialidad) this.especialidad = datos.especialidad;
        if (datos.avatarUrl) this.avatarUrl = datos.avatarUrl;
        if (datos.contactoNombre) this.contactoNombre = datos.contactoNombre;
        if (datos.contactoTelefono) this.contactoTelefono = datos.contactoTelefono;
        if (datos.contactoRelacion) this.contactoRelacion = datos.contactoRelacion;
        if (datos.forceValue) this.forceValue = datos.forceValue;
      } catch (e) {
        console.error('Error al cargar perfil extendido:', e);
      }
    }
  }

  get forceLabel() {
    if (this.forceValue < 35) return `${this.forceValue}% (Ultra Delicado)`;
    if (this.forceValue < 70) return `${this.forceValue}% (Normal)`;
    return `${this.forceValue}% (Fuerte)`;
  }

  // Cargar imagen de avatar seleccionada
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Guardar datos modificados del perfil en el almacenamiento local
  guardarPerfil() {
    const datosExt = {
      nombre: this.nombre,
      especialidad: this.especialidad,
      avatarUrl: this.avatarUrl,
      contactoNombre: this.contactoNombre,
      contactoTelefono: this.contactoTelefono,
      contactoRelacion: this.contactoRelacion,
      forceValue: this.forceValue
    };

    localStorage.setItem('user_profile_extended', JSON.stringify(datosExt));
    
    this.saveSuccess = true;
    setTimeout(() => {
      this.saveSuccess = false;
    }, 3000);
  }

  // Cierre de sesión
  handleLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}