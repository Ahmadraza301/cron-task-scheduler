import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task, TaskStatus } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();

  constructor() { }

  getTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  addTask(taskData: Omit<Task, 'id' | 'status'>): void {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      status: TaskStatus.Active
    };
    
    const currentTasks = this.tasksSubject.value;
    this.tasksSubject.next([...currentTasks, newTask]);
  }

  updateTask(task: Task): void {
    const currentTasks = this.tasksSubject.value;
    const updatedTasks = currentTasks.map(t => 
      t.id === task.id ? task : t
    );
    this.tasksSubject.next(updatedTasks);
  }

  deleteTask(id: string): void {
    const currentTasks = this.tasksSubject.value;
    const filteredTasks = currentTasks.filter(t => t.id !== id);
    this.tasksSubject.next(filteredTasks);
  }

  toggleTaskStatus(id: string): void {
    const currentTasks = this.tasksSubject.value;
    const updatedTasks = currentTasks.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: t.status === TaskStatus.Active ? TaskStatus.Paused : TaskStatus.Active
        };
      }
      return t;
    });
    this.tasksSubject.next(updatedTasks);
  }
}
