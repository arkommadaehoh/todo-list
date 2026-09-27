import { Injectable, computed, inject } from '@angular/core';
import { TodoService } from './todo.service';
import { Todo } from './todo.model';

export interface CalendarDay {
  date: Date;
  dateStr: string;       // 'YYYY-MM-DD'
  isCurrentMonth: boolean;
  isToday: boolean;
  todos: Todo[];
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private todoService = inject(TodoService);

  /** Map of dateStr -> todos for fast lookup */
  readonly todosByDate = computed(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of this.todoService.todos()) {
      if (todo.dueDate) {
        const list = map.get(todo.dueDate) ?? [];
        list.push(todo);
        map.set(todo.dueDate, list);
      }
    }
    return map;
  });

  todosForDate(dateStr: string): Todo[] {
    return this.todosByDate().get(dateStr) ?? [];
  }

  /** Build a 6-week grid (42 cells) for a given year/month */
  buildMonthGrid(year: number, month: number): CalendarDay[] {
    const todayStr = this.toDateStr(new Date());
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0=Sun

    const days: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(year, month, 1 - startOffset + i);
      const dateStr = this.toDateStr(date);
      days.push({
        date,
        dateStr,
        isCurrentMonth: date.getMonth() === month,
        isToday: dateStr === todayStr,
        todos: this.todosForDate(dateStr),
      });
    }
    return days;
  }

  toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
