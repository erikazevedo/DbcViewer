import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

type Theme = 'light' | 'dark' | 'auto';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly theme = signal<Theme>('auto');
  /** The theme actually applied, after resolving 'auto' against the OS preference. */
  readonly resolved = signal<'light' | 'dark'>('light');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark' || saved === 'auto') this.theme.set(saved);

      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => this.applyTheme());

      effect(() => {
        this.applyTheme();
        localStorage.setItem('theme', this.theme());
      });
    }
  }

  toggle() {
    this.theme.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private applyTheme() {
    const theme = this.theme();
    const resolved =
      theme === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    this.resolved.set(resolved);
    this.document.documentElement.setAttribute('data-theme', resolved);
    this.document.body.setAttribute('data-bs-theme', resolved);
  }
}
