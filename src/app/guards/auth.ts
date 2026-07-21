import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

// Guard para proteger rutas privadas (/home, /configuracion)
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirigir a la página de login si no está autenticado
  return router.navigate(['/login']);
};

// Guard para evitar que un usuario con sesión iniciada vuelva a la pantalla de login
export const redirectIfAuthenticatedGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Redirigir a la pantalla principal independiente /home
    return router.navigate(['/home']);
  }

  return true;
};
