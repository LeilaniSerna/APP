import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private http = inject(HttpClient);

  private currentLangSubject = new BehaviorSubject<string>('es');
  public currentLang$ = this.currentLangSubject.asObservable();

  private translations: Record<string, string> = {};

  constructor() {
    const savedLang = localStorage.getItem('lang') || 'es';
    this.setLanguage(savedLang);
  }

  async setLanguage(lang: string): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, string>>(`assets/i18n/${lang}.json`)
      );
      this.translations = data || {};
      this.currentLangSubject.next(lang);
      localStorage.setItem('lang', lang);
    } catch (err) {
      console.error(`Error loading language file for ${lang}`, err);
    }
  }

  getCurrentLanguage(): string {
    return this.currentLangSubject.value;
  }

  translate(key: string): string {
    return this.translations[key] || key;
  }
}
