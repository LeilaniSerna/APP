import { Routes } from '@angular/router';
import { authGuard, redirectIfAuthenticatedGuard } from './guards/auth';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage),
    canActivate: [redirectIfAuthenticatedGuard]
  },
  {
    path: 'home',
    loadComponent: () => import('./principal/principal.page').then(m => m.HomePage),
    canActivate: [authGuard]
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./configuracion/configuracion.page').then(m => m.ConfiguracionPage),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];