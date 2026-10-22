export type TodoStatus = 'todo' | 'in-progress' | 'done';

export interface Todo {
  id: number;
  title: string;
  dueDate: string | null;
  completed: boolean;
  status: TodoStatus;
  /** Position in the list; written on save so manual ordering survives reloads. */
  order?: number;
}
