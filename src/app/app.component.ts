import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TodoStore } from './todo.store';
import { I18nStore, Lang } from './i18n.store';
import { LabelStore } from './label.store';
import { PomodoroSettingsStore } from './pomodoro/pomodoro-settings.store';
import { TodoStatus } from './todo.model';
import { LabelManagerComponent } from './shared/components/label-manager/label-manager.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, LabelManagerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly todoService = inject(TodoStore);
  readonly i18n        = inject(I18nStore);
  readonly pomSettings = inject(PomodoroSettingsStore);
  private readonly labelStore = inject(LabelStore);
  private readonly router = inject(Router);

  isWide = signal(false);
  settingsOpen = signal(false);

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

  openSettings(): void  { this.settingsOpen.set(true);  }
  closeSettings(): void { this.settingsOpen.set(false); }

  setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }

  /** Export all tasks to an .xlsx file, ordered by creation (ids are assigned incrementally). */
  async exportToExcel(): Promise<void> {
    // exceljs is CommonJS; in the production bundle its exports live on `default`.
    const mod = await import('exceljs');
    const Workbook = (mod.default ?? mod).Workbook;
    const statusKey: Record<TodoStatus, string> = {
      'todo': 'kanbanTodo',
      'in-progress': 'kanbanInProgress',
      'done': 'kanbanDone',
    };
    const labelMap = this.labelStore.labelMap();

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Tasks');
    sheet.columns = [
      { header: this.i18n.t('exportColTask'),   key: 'title',  width: 40 },
      { header: this.i18n.t('exportColDate'),   key: 'date',   width: 14 },
      { header: this.i18n.t('exportColLabel'),  key: 'labels', width: 30 },
      { header: this.i18n.t('exportColStatus'), key: 'status', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };

    [...this.todoService.todos()]
      .sort((a, b) => a.id - b.id)
      .forEach(t => sheet.addRow({
        title:  t.title,
        date:   t.dueDate ?? '',
        labels: (t.labelIds ?? []).map(id => labelMap.get(id)?.text).filter(Boolean).join(', '),
        status: this.i18n.t(statusKey[t.status]),
      }));

    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }
}
