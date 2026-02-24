import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import cronstrue from 'cronstrue';
import { TaskService } from '../../services/task';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css'
})
export class TaskFormComponent implements OnInit, OnDestroy {
  taskForm!: FormGroup;
  cronReadable$!: Observable<string>;
  editingTask: Task | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupCronTranslation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.taskForm = this.fb.group({
      name: ['', [Validators.required, this.noWhitespaceValidator]],
      description: [''],
      cronExpression: ['', [Validators.required, this.noWhitespaceValidator]]
    });
  }

  private noWhitespaceValidator(control: any) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  private setupCronTranslation(): void {
    this.cronReadable$ = this.taskForm.get('cronExpression')!.valueChanges.pipe(
      startWith(''),
      map(expression => {
        if (!expression || expression.trim() === '') {
          return '';
        }
        try {
          return cronstrue.toString(expression);
        } catch (error) {
          return 'Invalid Cron Expression';
        }
      }),
      takeUntil(this.destroy$)
    );
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const formValue = this.taskForm.value;

    if (this.editingTask) {
      // Update existing task
      const updatedTask: Task = {
        ...this.editingTask,
        name: formValue.name,
        description: formValue.description,
        cronExpression: formValue.cronExpression
      };
      this.taskService.updateTask(updatedTask);
    } else {
      // Add new task
      this.taskService.addTask({
        name: formValue.name,
        description: formValue.description,
        cronExpression: formValue.cronExpression
      });
    }

    this.resetForm();
  }

  editTask(task: Task): void {
    this.editingTask = task;
    this.taskForm.patchValue({
      name: task.name,
      description: task.description || '',
      cronExpression: task.cronExpression
    });
  }

  resetForm(): void {
    this.editingTask = null;
    this.taskForm.reset();
  }

  get name() {
    return this.taskForm.get('name');
  }

  get cronExpression() {
    return this.taskForm.get('cronExpression');
  }

  get isEditing(): boolean {
    return this.editingTask !== null;
  }
}
