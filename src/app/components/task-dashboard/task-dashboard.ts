import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import cronstrue from 'cronstrue';
import { TaskService } from '../../services/task';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-dashboard',
  imports: [CommonModule],
  templateUrl: './task-dashboard.html',
  styleUrl: './task-dashboard.css'
})
export class TaskDashboardComponent implements OnInit {
  tasks$!: Observable<Task[]>;
  @Output() editTask = new EventEmitter<Task>();

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.tasks$ = this.taskService.getTasks();
  }

  onEdit(task: Task): void {
    this.editTask.emit(task);
  }

  onDelete(id: string): void {
    this.taskService.deleteTask(id);
  }

  onToggleStatus(id: string): void {
    this.taskService.toggleTaskStatus(id);
  }

  getReadableCron(expression: string): string {
    try {
      return cronstrue.toString(expression);
    } catch (error) {
      return 'Invalid Cron Expression';
    }
  }

  getStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-paused';
  }

  getToggleButtonText(status: string): string {
    return status === 'Active' ? 'Pause' : 'Resume';
  }
}
