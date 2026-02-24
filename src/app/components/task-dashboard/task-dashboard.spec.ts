import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskDashboardComponent } from './task-dashboard';
import { TaskService } from '../../services/task';
import { TaskStatus } from '../../models/task.model';
import * as fc from 'fast-check';

describe('TaskDashboardComponent', () => {
  let component: TaskDashboardComponent;
  let fixture: ComponentFixture<TaskDashboardComponent>;
  let taskService: TaskService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDashboardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDashboardComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Feature: cron-task-scheduler, Property 8: Dashboard displays all tasks from service
  describe('Property 8: Dashboard displays all tasks from service', () => {
    it('should display all tasks without missing or duplicating any', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ maxLength: 500 }),
              cronExpression: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (taskDataArray) => {
            const testService = new TaskService();
            const testFixture = TestBed.createComponent(TaskDashboardComponent);
            const testComponent = testFixture.componentInstance;
            
            // Override the service
            (testComponent as any).taskService = testService;
            testComponent.ngOnInit();
            testFixture.detectChanges();

            // Add all tasks
            taskDataArray.forEach(taskData => {
              testService.addTask(taskData);
            });

            // Get tasks from component's observable
            let displayedTasks: any[] = [];
            testComponent.tasks$.subscribe(tasks => {
              displayedTasks = tasks;
            });

            // Verify all tasks are displayed
            expect(displayedTasks.length).toBe(taskDataArray.length);

            // Verify no duplicates
            const ids = displayedTasks.map(t => t.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(displayedTasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 9: Task display includes all required fields
  describe('Property 9: Task display includes all required fields', () => {
    it('should include name, description, cron, readable schedule, and status for each task', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, description, cronExpression) => {
            const testService = new TaskService();
            testService.addTask({ name, description, cronExpression });

            let tasks: any[] = [];
            testService.getTasks().subscribe(t => tasks = t);

            const task = tasks[0];

            // Verify all required fields are present
            expect(task.id).toBeDefined();
            expect(task.name).toBe(name);
            expect(task.description).toBe(description);
            expect(task.cronExpression).toBe(cronExpression);
            expect(task.status).toBeDefined();
            expect([TaskStatus.Active, TaskStatus.Paused]).toContain(task.status);

            // Verify readable cron can be generated
            const testComponent = new TaskDashboardComponent(testService);
            const readable = testComponent.getReadableCron(cronExpression);
            expect(readable).toBeDefined();
            expect(typeof readable).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 10: Service updates trigger dashboard re-render
  describe('Property 10: Service updates trigger dashboard re-render', () => {
    it('should reflect service changes in the component observable', () => {
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
            const testFixture = TestBed.createComponent(TaskDashboardComponent);
            const testComponent = testFixture.componentInstance;
            
            (testComponent as any).taskService = testService;
            testComponent.ngOnInit();

            let displayedTasks: any[] = [];
            let emissionCount = 0;

            testComponent.tasks$.subscribe(tasks => {
              displayedTasks = tasks;
              emissionCount++;
            });

            // Initial emission (empty)
            expect(emissionCount).toBe(1);
            expect(displayedTasks.length).toBe(0);

            // Add tasks and verify updates
            taskDataArray.forEach((taskData, index) => {
              testService.addTask(taskData);
              expect(displayedTasks.length).toBe(index + 1);
            });

            expect(emissionCount).toBe(taskDataArray.length + 1);

            // Delete a task and verify update
            if (displayedTasks.length > 0) {
              const taskToDelete = displayedTasks[0];
              testService.deleteTask(taskToDelete.id);
              expect(displayedTasks.length).toBe(taskDataArray.length - 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
