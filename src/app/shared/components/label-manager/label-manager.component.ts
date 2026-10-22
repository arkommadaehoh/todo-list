import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabelStore, LABEL_COLORS } from '../../../label.store';
import { I18nStore } from '../../../i18n.store';
import { Label } from '../../../todo.model';

@Component({
  selector: 'app-label-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './label-manager.component.html',
  styleUrls: ['./label-manager.component.scss'],
})
export class LabelManagerComponent {
  readonly labelStore = inject(LabelStore);
  readonly i18n = inject(I18nStore);

  readonly palette = LABEL_COLORS;

  // New label form
  newText = '';
  newColor = LABEL_COLORS[4]; // default blue

  // Inline-edit state
  editingId = signal<number | null>(null);
  editText = '';
  editColor = '';

  addLabel(): void {
    if (!this.newText.trim()) return;
    this.labelStore.addLabel(this.newText, this.newColor);
    this.newText = '';
    this.newColor = LABEL_COLORS[4];
  }

  startEdit(label: Label): void {
    this.editingId.set(label.id);
    this.editText = label.text;
    this.editColor = label.color;
  }

  saveEdit(id: number): void {
    if (!this.editText.trim()) return;
    this.labelStore.renameLabel(id, this.editText);
    this.labelStore.recolorLabel(id, this.editColor);
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editText = '';
    this.editColor = '';
  }

  removeLabel(id: number): void {
    if (!confirm(this.i18n.t('labelConfirmDelete'))) return;
    this.labelStore.removeLabel(id);
    if (this.editingId() === id) this.cancelEdit();
  }

  trackById(_: number, label: Label): number {
    return label.id;
  }
}
