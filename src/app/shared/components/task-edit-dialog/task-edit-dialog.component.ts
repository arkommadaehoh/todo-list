import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Todo } from '../../../todo.model';
import { TodoStore } from '../../../todo.store';
import { LabelStore } from '../../../label.store';
import { I18nStore } from '../../../i18n.store';
import { DatePickerComponent } from '../date-picker/date-picker.component';

/** Modal popup for editing a task: title, description, labels and due date. */
@Component({
  selector: 'app-task-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './task-edit-dialog.component.html',
  styleUrls: ['./task-edit-dialog.component.scss']
})
export class TaskEditDialogComponent {
  private readonly todoStore = inject(TodoStore);
  readonly labelStore = inject(LabelStore);
  readonly i18n = inject(I18nStore);

  private id = 0;
  title = '';
  description = '';
  dueDate = '';
  labelIds: number[] = [];

  @Input({ required: true }) set todo(t: Todo) {
    this.id = t.id;
    this.title = t.title;
    this.description = t.description ?? '';
    this.dueDate = t.dueDate ?? '';
    this.labelIds = [...(t.labelIds ?? [])];
  }

  /** Emitted after Save or Cancel so the host can hide the dialog. */
  @Output() closed = new EventEmitter<void>();

  toggleLabel(id: number): void {
    this.labelIds = this.labelIds.includes(id)
      ? this.labelIds.filter(x => x !== id)
      : [...this.labelIds, id];
  }

  save(): void {
    if (!this.title.trim()) return;
    this.todoStore.update(this.id, {
      title: this.title.trim(),
      description: this.description.trim(),
      dueDate: this.dueDate || null,
      labelIds: [...this.labelIds],
    });
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  cancel(): void {
    this.closed.emit();
  }
}
