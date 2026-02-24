import { TestBed } from '@angular/core/testing';
import { TaskService } from './task';
import { TaskStatus } from '../models/task.model';
import * as fc from 'fast-check';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Feature: cron-task-scheduler, Property 1: Task creation generates unique IDs and active status
  describe('Property 1: Task creation generates unique IDs and active status', () => {
    it('should generate unique IDs and set status to Active for all new tasks', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, description, cronExpression) => {
            // Create a fresh service instance for each test
            const testService = new TaskService();
            const existingIds = new Set<string>();

            // Add the task
            testService.addTask({ name, description, cronExpression });

            // Get the tasks
            let tasks: any[] = [];
            testService.getTasks().subscribe(t => tasks = t);

            // Verify the task was added
            expect(tasks.length).toBe(1);
            const addedTask = tasks[0];

            // Verify unique ID
            expect(addedTask.id).toBeDefined();
            expect(typeof addedTask.id).toBe('string');
            expect(addedTask.id.length).toBeGreaterThan(0);
            expect(existingIds.has(addedTask.id)).toBe(false);
            existingIds.add(addedTask.id);

            // Verify status is Active
            expect(addedTask.status).toBe(TaskStatus.Active);

            // Verify other properties
            expect(addedTask.name).toBe(name);
            expect(addedTask.description).toBe(description);
            expect(addedTask.cronExpression).toBe(cronExpression);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different IDs for multiple tasks', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ maxLength: 500 }),
              cronExpression: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (taskDataArray) => {
            const testService = new TaskService();
            const ids = new Set<string>();

            // Add all tasks
            taskDataArray.forEach(taskData => {
              testService.addTask(taskData);
            });

            // Get all tasks
            let tasks: any[] = [];
            testService.getTasks().subscribe(t => tasks = t);

            // Verify all IDs are unique
            tasks.forEach(task => {
              expect(ids.has(task.id)).toBe(false);
              ids.add(task.id);
              expect(task.status).toBe(TaskStatus.Active);
            });

            expect(ids.size).toBe(taskDataArray.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

  // Feature: cron-task-scheduler, Property 12: Task updates preserve ID
  describe('Property 12: Task updates preserve ID', () => {
    it('should preserve task ID when updating task properties', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name1, desc1, cron1, name2, desc2, cron2) => {
            const testService = new TaskService();

            // Add initial task
            testService.addTask({ name: name1, description: desc1, cronExpression: cron1 });

            // Get the task and its ID
            let tasks: any[] = [];
            testService.getTasks().subscribe(t => tasks = t);
            const originalId = tasks[0].id;

            // Update the task
            const updatedTask = {
              ...tasks[0],
              name: name2,
              description: desc2,
              cronExpression: cron2
            };
            testService.updateTask(updatedTask);

            // Get updated tasks
            testService.getTasks().subscribe(t => tasks = t);

            // Verify ID is preserved
            expect(tasks.length).toBe(1);
            expect(tasks[0].id).toBe(originalId);

            // Verify properties were updated
            expect(tasks[0].name).toBe(name2);
            expect(tasks[0].description).toBe(desc2);
            expect(tasks[0].cronExpression).toBe(cron2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 15: Task deletion removes task from list
  describe('Property 15: Task deletion removes task from list', () => {
    it('should remove the specified task from the list', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ maxLength: 500 }),
              cronExpression: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: 0 }),
          (taskDataArray, indexSeed) => {
            const testService = new TaskService();

            // Add all tasks
            taskDataArray.forEach(taskData => {
              testService.addTask(taskData);
            });

            // Get tasks and select one to delete
            let tasks: any[] = [];
            testService.getTasks().subscribe(t => tasks = t);
            const initialCount = tasks.length;

            if (initialCount === 0) return; // Skip if no tasks

            const indexToDelete = indexSeed % initialCount;
            const taskToDelete = tasks[indexToDelete];

            // Delete the task
            testService.deleteTask(taskToDelete.id);

            // Get updated tasks
            testService.getTasks().subscribe(t => tasks = t);

            // Verify task was removed
            expect(tasks.length).toBe(initialCount - 1);
            expect(tasks.find(t => t.id === taskToDelete.id)).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 13: Active task toggle changes status to paused
  // Feature: cron-task-scheduler, Property 14: Paused task toggle changes status to active
  describe('Property 13 & 14: Task status toggle', () => {
    it('should toggle Active tasks to Paused', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, description, cronExpression) => {
            const testService = new TaskService();

            // Add task (defaults to Active)
            testService.addTask({ name, description, cronExpression });

            // Get the task
            let tasks: any[] = [];
            testService.getTasks().subscribe(t => tasks = t);
            const taskId = tasks[0].id;

            // Verify initial status is Active
            expect(tasks[0].status).toBe(TaskStatus.Active);

            // Toggle status
            testService.toggleTaskStatus(taskId);

            // Get updated task
            testService.getTasks().subscribe(t => tasks = t);

            // Verify status changed to Paused
            expect(tasks[0].status).toBe(TaskStatus.Paused);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should toggle Paused tasks to Active', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, description, cronExpression) => {
            const testService = new TaskService();

            // Add task
            testService.addTask({ name, description, cronExpression });

            // Get the task
            let tasks: any[] = [];
            testService.getTasks().subscribe(t => tasks = t);
            const taskId = tasks[0].id;

            // Toggle to Paused
            testService.toggleTaskStatus(taskId);
            testService.getTasks().subscribe(t => tasks = t);
            expect(tasks[0].status).toBe(TaskStatus.Paused);

            // Toggle back to Active
            testService.toggleTaskStatus(taskId);
            testService.getTasks().subscribe(t => tasks = t);

            // Verify status changed to Active
            expect(tasks[0].status).toBe(TaskStatus.Active);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 4: Service mutations emit to all subscribers
  describe('Property 4: Service mutations emit to all subscribers', () => {
    it('should emit updated task list to all subscribers on any mutation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ maxLength: 500 }),
              cronExpression: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (taskDataArray) => {
            const testService = new TaskService();
            let subscriber1Tasks: any[] = [];
            let subscriber2Tasks: any[] = [];
            let subscriber1Count = 0;
            let subscriber2Count = 0;

            // Create two subscribers
            testService.getTasks().subscribe(tasks => {
              subscriber1Tasks = tasks;
              subscriber1Count++;
            });

            testService.getTasks().subscribe(tasks => {
              subscriber2Tasks = tasks;
              subscriber2Count++;
            });

            // Initial emission (empty array)
            expect(subscriber1Count).toBe(1);
            expect(subscriber2Count).toBe(1);

            // Test addTask emission
            testService.addTask(taskDataArray[0]);
            expect(subscriber1Count).toBe(2);
            expect(subscriber2Count).toBe(2);
            expect(subscriber1Tasks.length).toBe(1);
            expect(subscriber2Tasks.length).toBe(1);

            // Test updateTask emission
            const taskToUpdate = { ...subscriber1Tasks[0], name: 'Updated' };
            testService.updateTask(taskToUpdate);
            expect(subscriber1Count).toBe(3);
            expect(subscriber2Count).toBe(3);

            // Test toggleTaskStatus emission
            testService.toggleTaskStatus(subscriber1Tasks[0].id);
            expect(subscriber1Count).toBe(4);
            expect(subscriber2Count).toBe(4);

            // Test deleteTask emission
            testService.deleteTask(subscriber1Tasks[0].id);
            expect(subscriber1Count).toBe(5);
            expect(subscriber2Count).toBe(5);
            expect(subscriber1Tasks.length).toBe(0);
            expect(subscriber2Tasks.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
