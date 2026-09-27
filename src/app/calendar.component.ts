import {
  Component, inject, signal, computed, OnInit, Input, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService, CalendarDay } from './calendar.service';
import { TodoService } from './todo.service';
import { Todo } from './todo.model';

type CalView = 'month' | 'day';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  private calService  = inject(CalendarService);
  readonly todoService = inject(TodoService);

  // ── View state ───────────────────────────────────────────────
  calView   = signal<CalView>('month');
  curYear   = signal(new Date().getFullYear());
  curMonth  = signal(new Date().getMonth());
  curDay    = signal(new Date());

  readonly MONTHS   = MONTHS;
  readonly WEEKDAYS = WEEKDAYS;

  // ── Month grid (recomputed when month/year or todos change) ──
  readonly monthGrid = computed<CalendarDay[]>(() =>
    this.calService.buildMonthGrid(this.curYear(), this.curMonth())
  );

  readonly monthLabel = computed(() =>
    `${MONTHS[this.curMonth()]} ${this.curYear()}`
  );

  readonly dayLabel = computed(() => {
    const d = this.curDay();
    return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  });

  readonly dayDateStr = computed(() => this.calService.toDateStr(this.curDay()));

  readonly dayTodos = computed<Todo[]>(() =>
    this.calService.todosForDate(this.dayDateStr())
  );

  // ── Quick-add from calendar ───────────────────────────────────
  quickTitle = '';

  ngOnInit(): void {}

  // ── Navigation ───────────────────────────────────────────────
  prevMonth(): void {
    if (this.curMonth() === 0) {
      this.curMonth.set(11);
      this.curYear.update(y => y - 1);
    } else {
      this.curMonth.update(m => m - 1);
    }
  }

  nextMonth(): void {
    if (this.curMonth() === 11) {
      this.curMonth.set(0);
      this.curYear.update(y => y + 1);
    } else {
      this.curMonth.update(m => m + 1);
    }
  }

  prevDay(): void {
    const d = new Date(this.curDay());
    d.setDate(d.getDate() - 1);
    this.curDay.set(d);
  }

  nextDay(): void {
    const d = new Date(this.curDay());
    d.setDate(d.getDate() + 1);
    this.curDay.set(d);
  }

  goToday(): void {
    const now = new Date();
    this.curDay.set(now);
    this.curYear.set(now.getFullYear());
    this.curMonth.set(now.getMonth());
  }

  // ── Select a day cell in month view → switch to day view ─────
  selectDay(cell: CalendarDay): void {
    this.curDay.set(cell.date);
    this.calView.set('day');
  }

  // ── Quick-add todo on the selected day ───────────────────────
  quickAdd(): void {
    if (!this.quickTitle.trim()) return;
    this.todoService.add(this.quickTitle.trim(), this.dayDateStr());
    this.quickTitle = '';
  }

  // ── Toggle complete directly from calendar ────────────────────
  toggleComplete(id: number): void {
    this.todoService.toggleComplete(id);
  }

  removeTodo(id: number): void {
    this.todoService.remove(id);
  }

  isToday(dateStr: string): boolean {
    return dateStr === this.calService.toDateStr(new Date());
  }

  trackByDate(_: number, day: CalendarDay): string { return day.dateStr; }
  trackById(_: number, t: Todo): number { return t.id; }
}
