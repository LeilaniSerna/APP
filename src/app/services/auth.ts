import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  usuario: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  // Cargar sesión persistida al iniciar la aplicación
  private loadUserFromStorage() {
    const userStr = localStorage.getItem('user');
    const tokenStr = localStorage.getItem('token');
    
    if (userStr && tokenStr) {
      try {
        this.currentUserSubject.next(JSON.parse(userStr));
      } catch (e) {
        this.logout();
      }
    }
  }

  // Llamada al endpoint de login
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        if (res && res.token) {
          // Persistir token y datos básicos del usuario
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.usuario));
          this.currentUserSubject.next(res.usuario);
        }
      })
    );
  }

  // Cerrar sesión
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  // Obtener el token guardado
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Obtener los datos del usuario actual
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Comprobar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
