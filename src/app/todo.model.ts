export type TodoStatus = 'todo' | 'in-progress' | 'done';

export interface Label {
  id: number;
  text: string;
  color: string;
}

export interface Todo {
  id: number;
  title: string;
  /** Optional long-form notes. */
  description?: string;
  dueDate: string | null;
  completed: boolean;
  status: TodoStatus;
  labelIds?: number[];
  /** Position in the list; written on save so manual ordering survives reloads. */
  order?: number;
}
