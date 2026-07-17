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
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage),
    canActivate: [redirectIfAuthenticatedGuard]
  },
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then( m => m.TabsPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        // OJO: Aquí es donde apuntamos a tu carpeta principal
        loadComponent: () => import('./principal/principal.page').then(m => m.HomePage) 
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./configuracion/configuracion.page').then(m => m.ConfiguracionPage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];