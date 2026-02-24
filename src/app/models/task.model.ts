export enum TaskStatus {
  Active = 'Active',
  Paused = 'Paused'
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  status: TaskStatus;
}
