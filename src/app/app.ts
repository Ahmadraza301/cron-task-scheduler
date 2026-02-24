import { Component, ViewChild } from '@angular/core';
import { TaskFormComponent } from './components/task-form/task-form';
import { Task } from './models/task.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  @ViewChild(TaskFormComponent) taskForm!: TaskFormComponent;

  onEditTask(task: Task): void {
    if (this.taskForm) {
      this.taskForm.editTask(task);
      // Scroll to form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
