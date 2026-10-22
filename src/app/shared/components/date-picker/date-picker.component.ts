import {
  Component, Input, Output, EventEmitter,
  signal, computed, HostListener, ElementRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

const MONTHS   = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface PickerDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss']
})
export class DatePickerComponent {
  private el = inject(ElementRef);

  /** Value is always 'YYYY-MM-DD' or '' */
  @Input() set value(v: string) {
    this._value = v;
    if (v) {
      const d = new Date(v + 'T00:00:00');
      this.viewYear.set(d.getFullYear());
      this.viewMonth.set(d.getMonth());
    }
  }
  private _value = '';

  @Output() valueChange = new EventEmitter<string>();

  readonly MONTHS   = MONTHS;
  readonly WEEKDAYS = WEEKDAYS;

  open       = signal(false);
  viewYear   = signal(new Date().getFullYear());
  viewMonth  = signal(new Date().getMonth());

  readonly monthLabel = computed(() => `${MONTHS[this.viewMonth()]} ${this.viewYear()}`);

  readonly grid = computed<PickerDay[]>(() => {
    const todayStr    = this.isoToday();
    const firstDay    = new Date(this.viewYear(), this.viewMonth(), 1);
    const startOffset = firstDay.getDay();
    const days: PickerDay[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(this.viewYear(), this.viewMonth(), 1 - startOffset + i);
      const iso  = this.toIso(date);
      days.push({
        date,
        currentMonth: date.getMonth() === this.viewMonth(),
        isToday:   iso === todayStr,
        selected:  iso === this._value,
      });
    }
    return days;
  });

  toggleOpen(): void { this.open.update(v => !v); }

  prevMonth(): void {
    if (this.viewMonth() === 0) { this.viewMonth.set(11); this.viewYear.update(y => y - 1); }
    else { this.viewMonth.update(m => m - 1); }
  }

  nextMonth(): void {
    if (this.viewMonth() === 11) { this.viewMonth.set(0); this.viewYear.update(y => y + 1); }
    else { this.viewMonth.update(m => m + 1); }
  }

  selectDay(day: PickerDay): void {
    this.valueChange.emit(this.toIso(day.date));
    this.open.set(false);
  }

  selectToday(): void {
    this.valueChange.emit(this.isoToday());
    this.open.set(false);
  }

  clearDate(): void {
    this.valueChange.emit('');
    this.open.set(false);
  }

  /** Close when clicking outside */
  @HostListener('document:mousedown', ['$event'])
  onOutsideClick(e: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private isoToday(): string {
    return this.toIso(new Date());
  }

  /** 'YYYY-MM-DD' → 'dd/mm/yyyy' for the trigger label */
  displayValue(): string {
    if (!this._value) return '';
    const [y, m, d] = this._value.split('-');
    return `${d}/${m}/${y}`;
  }
}
