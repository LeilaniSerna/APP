import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

export interface Routine {
  _id?: string;
  userId?: string;
  titulo: string;
  categoria: string;
  comandos: string[];
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.authService.getToken() || '';
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      })
    };
  }

  // Obtener todas las rutinas del usuario autenticado desde la API
  getRoutines(): Observable<Routine[]> {
    return this.http.get<Routine[]>(`${this.apiUrl}/routines`, this.getAuthHeaders());
  }

  // Guardar una nueva rutina en la base de datos de MongoDB Atlas
  createRoutine(routine: Routine): Observable<Routine> {
    return this.http.post<Routine>(`${this.apiUrl}/routines`, routine, this.getAuthHeaders());
  }
}
