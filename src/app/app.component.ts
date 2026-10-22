import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TodoStore } from './todo.store';
import { I18nStore, Lang } from './i18n.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly todoService = inject(TodoStore);
  readonly i18n = inject(I18nStore);
  private readonly router = inject(Router);

  isWide = signal(false);

  constructor() {
    this.updateWide(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateWide(event.urlAfterRedirects || event.url);
      });
  }

  private updateWide(url: string): void {
    this.isWide.set(url.includes('/calendar') || url.includes('/kanban'));
  }

  setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }
}
