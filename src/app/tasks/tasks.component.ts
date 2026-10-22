import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoStore } from './todo.store';
import { LabelStore } from './label.store';
import { I18nStore } from './i18n.store';
import { Todo } from './todo.model';
import { DatePickerComponent } from './date-picker.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
  readonly todoService = inject(TodoStore);
  readonly labelStore = inject(LabelStore);
  readonly i18n = inject(I18nStore);

  // Add form state — newDueDate stored as YYYY-MM-DD (picker value)
  newTitle = '';
  newDueDate = this.todayStr();
  newLabelIds: number[] = [];

  // Edit state
  editingId = signal<number | null>(null);
  editTitle = '';
  editDueDate = '';
  editLabelIds: number[] = [];

  // Label picker open state
  labelPickerOpen = signal<'add' | 'edit' | null>(null);

  // Filter
  filter: 'all' | 'active' | 'completed' = 'all';

  get filteredTodos(): Todo[] {
    switch (this.filter) {
      case 'active':    return this.todoService.activeTodos();
      case 'completed': return this.todoService.completedTodos();
      default:          return this.todoService.todos();
    }
  }

  addTodo(): void {
    if (!this.newTitle.trim()) return;
    this.todoService.add(this.newTitle, this.newDueDate || null, [...this.newLabelIds]);
    this.newTitle = '';
    this.newDueDate = this.todayStr();
    this.newLabelIds = [];
    this.labelPickerOpen.set(null);
  }

  startEdit(todo: Todo): void {
    this.editingId.set(todo.id);
    this.editTitle = todo.title;
    this.editDueDate = todo.dueDate ?? '';
    this.editLabelIds = [...(todo.labelIds ?? [])];
    this.labelPickerOpen.set(null);
  }

  saveEdit(id: number): void {
    if (!this.editTitle.trim()) return;
    this.todoService.update(id, {
      title: this.editTitle.trim(),
      dueDate: this.editDueDate || null,
      labelIds: [...this.editLabelIds],
    });
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editTitle = '';
    this.editDueDate = '';
    this.editLabelIds = [];
    this.labelPickerOpen.set(null);
  }

  removeTodo(id: number): void {
    if (!confirm(this.i18n.t('confirmDelete'))) return;
    this.todoService.remove(id);
    if (this.editingId() === id) this.cancelEdit();
  }

  toggleComplete(id: number): void {
    this.todoService.toggleComplete(id);
  }

  isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  }

  isDueToday(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return dueDate === this.todayStr();
  }

  clearCompleted(): void {
    if (!confirm(this.i18n.t('confirmClearCompleted'))) return;
    this.todoService.completedTodos().forEach(t => this.todoService.remove(t.id));
  }

  // ── Label helpers ─────────────────────────────────────────────
  toggleNewLabel(id: number): void {
    const idx = this.newLabelIds.indexOf(id);
    if (idx === -1) this.newLabelIds = [...this.newLabelIds, id];
    else            this.newLabelIds = this.newLabelIds.filter(x => x !== id);
  }

  toggleEditLabel(id: number): void {
    const idx = this.editLabelIds.indexOf(id);
    if (idx === -1) this.editLabelIds = [...this.editLabelIds, id];
    else            this.editLabelIds = this.editLabelIds.filter(x => x !== id);
  }

  toggleLabelPicker(context: 'add' | 'edit'): void {
    this.labelPickerOpen.set(this.labelPickerOpen() === context ? null : context);
  }

  // Drag-to-reorder state
  draggingId: number | null = null;
  dropTargetId: number | null = null;
  dropAfter = false;

  onDragStart(event: DragEvent, todo: Todo): void {
    this.draggingId = todo.id;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(todo.id));
  }

  onDragOver(event: DragEvent, todo: Todo): void {
    if (this.draggingId === null) return;
    event.preventDefault();
    if (this.draggingId === todo.id) { this.dropTargetId = null; return; }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropTargetId = todo.id;
    this.dropAfter = event.clientY > rect.top + rect.height / 2;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.draggingId !== null && this.dropTargetId !== null) {
      this.todoService.move(this.draggingId, this.dropTargetId, this.dropAfter);
    }
    this.onDragEnd();
  }

  onDragEnd(): void {
    this.draggingId = null;
    this.dropTargetId = null;
  }

  trackById(_: number, todo: Todo): number {
    return todo.id;
  }

  /** Display: 'YYYY-MM-DD' → 'dd/mm/yyyy' */
  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  private todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
