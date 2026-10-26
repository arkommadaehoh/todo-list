import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoStore } from '../todo.store';
import { LabelStore } from '../label.store';
import { I18nStore } from '../i18n.store';
import { Todo, TodoStatus } from '../todo.model';
import { DatePickerComponent } from '../shared/components/date-picker/date-picker.component';
import { TaskEditDialogComponent } from '../shared/components/task-edit-dialog/task-edit-dialog.component';

interface Column {
  status: TodoStatus;
  labelKey: string;
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, TaskEditDialogComponent],
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.scss']
})
export class KanbanComponent {
  readonly todoService = inject(TodoStore);
  readonly labelStore = inject(LabelStore);
  readonly i18n = inject(I18nStore);

  readonly columns: Column[] = [
    { status: 'todo',        labelKey: 'kanbanTodo' },
    { status: 'in-progress', labelKey: 'kanbanInProgress' },
    { status: 'done',        labelKey: 'kanbanDone' }
  ];

  readonly byStatus = computed(() => {
    const map: Record<TodoStatus, Todo[]> = { 'todo': [], 'in-progress': [], 'done': [] };
    for (const t of this.todoService.todos()) map[t.status].push(t);
    return map;
  });

  newTitle = '';
  newDueDate = this.todayStr();
  draggingId: number | null = null;
  dragOverStatus: TodoStatus | null = null;
  dropTargetId: number | null = null;
  dropAfter = false;
  editingTodo = signal<Todo | null>(null);

  add(): void {
    if (!this.newTitle.trim()) return;
    this.todoService.add(this.newTitle, this.newDueDate || null);
    this.newTitle = '';
    this.newDueDate = this.todayStr();
  }

  startEdit(todo: Todo): void {
    this.editingTodo.set(todo);
  }

  closeEdit(): void {
    this.editingTodo.set(null);
  }

  onDragStart(event: DragEvent, todo: Todo): void {
    this.draggingId = todo.id;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(todo.id));
  }

  onDragEnd(): void {
    this.draggingId = null;
    this.dragOverStatus = null;
    this.dropTargetId = null;
  }

  onCardDragOver(event: DragEvent, todo: Todo): void {
    if (this.draggingId === null || this.draggingId === todo.id) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropTargetId = todo.id;
    this.dropAfter = event.clientY > rect.top + rect.height / 2;
  }

  onCardDrop(event: DragEvent, todo: Todo): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.draggingId !== null) {
      this.todoService.move(this.draggingId, todo.id, this.dropAfter, todo.status);
    }
    this.onDragEnd();
  }

  onDragOver(event: DragEvent, status: TodoStatus): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverStatus = status;
  }

  onDragLeave(status: TodoStatus): void {
    if (this.dragOverStatus === status) this.dragOverStatus = null;
  }

  onDrop(event: DragEvent, status: TodoStatus): void {
    event.preventDefault();
    if (this.draggingId !== null) this.todoService.move(this.draggingId, null, false, status);
    this.onDragEnd();
  }

  remove(id: number): void {
    if (!confirm(this.i18n.t('confirmDelete'))) return;
    this.todoService.remove(id);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  private todayStr(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  trackById(_: number, t: Todo): number { return t.id; }
}
