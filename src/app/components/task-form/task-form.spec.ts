import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskFormComponent } from './task-form';
import { TaskService } from '../../services/task';
import * as fc from 'fast-check';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;
  let taskService: TaskService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Feature: cron-task-scheduler, Property 2: Empty name validation prevents submission
  describe('Property 2: Empty name validation prevents submission', () => {
    it('should prevent submission when name is empty or whitespace', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.stringMatching(/^\s+$/)
          ),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (emptyName, description, cronExpression) => {
            component.taskForm.patchValue({
              name: emptyName,
              description: description,
              cronExpression: cronExpression
            });

            // Form should be invalid
            expect(component.taskForm.valid).toBe(false);
            expect(component.name?.invalid).toBe(true);

            // Attempt submission
            const initialTaskCount = taskService['tasksSubject'].value.length;
            component.onSubmit();

            // Verify no task was added
            const finalTaskCount = taskService['tasksSubject'].value.length;
            expect(finalTaskCount).toBe(initialTaskCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 3: Empty cron expression validation prevents submission
  describe('Property 3: Empty cron expression validation prevents submission', () => {
    it('should prevent submission when cron expression is empty or whitespace', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.stringMatching(/^\s+$/)
          ),
          (name, description, emptyCron) => {
            component.taskForm.patchValue({
              name: name,
              description: description,
              cronExpression: emptyCron
            });

            // Form should be invalid
            expect(component.taskForm.valid).toBe(false);
            expect(component.cronExpression?.invalid).toBe(true);

            // Attempt submission
            const initialTaskCount = taskService['tasksSubject'].value.length;
            component.onSubmit();

            // Verify no task was added
            const finalTaskCount = taskService['tasksSubject'].value.length;
            expect(finalTaskCount).toBe(initialTaskCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

  // Feature: cron-task-scheduler, Property 5: Cron expression changes trigger translation updates
  describe('Property 5: Cron expression changes trigger translation updates', () => {
    it('should emit new translation when cron expression changes', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
          (cronExpressions) => {
            const testFixture = TestBed.createComponent(TaskFormComponent);
            const testComponent = testFixture.componentInstance;
            testFixture.detectChanges();
            
            const emissions: string[] = [];
            
            const subscription = testComponent.cronReadable$.subscribe((translation: string) => {
              emissions.push(translation);
            });

            // Change cron expression multiple times
            for (const cron of cronExpressions) {
              testComponent.taskForm.patchValue({ cronExpression: cron });
            }

            // Verify we got emissions for each change
            expect(emissions.length).toBeGreaterThanOrEqual(cronExpressions.length);
            
            subscription.unsubscribe();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 6: Valid cron expressions produce readable translations
  describe('Property 6: Valid cron expressions produce readable translations', () => {
    it('should produce non-empty readable text for valid cron expressions', () => {
      const validCronExpressions = [
        '0 0 * * *',      // Daily at midnight
        '0 12 * * *',     // Daily at noon
        '*/5 * * * *',    // Every 5 minutes
        '0 0 1 * *',      // First day of month
        '0 0 * * 0',      // Every Sunday
        '30 2 * * 1-5',   // Weekdays at 2:30 AM
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...validCronExpressions),
          (validCron) => {
            const testFixture = TestBed.createComponent(TaskFormComponent);
            const testComponent = testFixture.componentInstance;
            testFixture.detectChanges();
            
            let translation = '';
            
            const subscription = testComponent.cronReadable$.subscribe((t: string) => {
              translation = t;
            });

            testComponent.taskForm.patchValue({ cronExpression: validCron });

            // Verify translation is non-empty and not an error
            expect(translation).toBeTruthy();
            expect(translation).not.toBe('Invalid Cron Expression');
            expect(translation.length).toBeGreaterThan(0);
            
            subscription.unsubscribe();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 7: Invalid cron expressions display error message
  describe('Property 7: Invalid cron expressions display error message', () => {
    it('should display error message for invalid cron expressions without crashing', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.match(/^[\d\s\*\/\-,]+$/)),
            fc.constant('invalid'),
            fc.constant('not a cron'),
            fc.constant('99 99 99 99 99'),
            fc.constant('* * * *'),  // Too few fields
          ),
          (invalidCron) => {
            const testFixture = TestBed.createComponent(TaskFormComponent);
            const testComponent = testFixture.componentInstance;
            testFixture.detectChanges();
            
            let translation = '';
            let errorThrown = false;
            
            try {
              const subscription = testComponent.cronReadable$.subscribe((t: string) => {
                translation = t;
              });

              testComponent.taskForm.patchValue({ cronExpression: invalidCron });
              
              subscription.unsubscribe();
            } catch (error) {
              errorThrown = true;
            }

            // Verify no error was thrown and error message is displayed
            expect(errorThrown).toBe(false);
            expect(translation).toBe('Invalid Cron Expression');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 16: Form reset clears all fields after submission
  describe('Property 16: Form reset clears all fields after submission', () => {
    it('should clear all form fields after successful submission', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, description, cronExpression) => {
            const testFixture = TestBed.createComponent(TaskFormComponent);
            const testComponent = testFixture.componentInstance;
            testFixture.detectChanges();
            
            // Fill the form
            testComponent.taskForm.patchValue({
              name: name,
              description: description,
              cronExpression: cronExpression
            });

            // Verify form has values
            expect(testComponent.taskForm.value.name).toBe(name);
            expect(testComponent.taskForm.value.description).toBe(description);
            expect(testComponent.taskForm.value.cronExpression).toBe(cronExpression);

            // Submit the form
            testComponent.onSubmit();

            // Verify form is reset
            expect(testComponent.taskForm.value.name).toBeNull();
            expect(testComponent.taskForm.value.description).toBeNull();
            expect(testComponent.taskForm.value.cronExpression).toBeNull();
            expect(testComponent.editingTask).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: cron-task-scheduler, Property 11: Edit action populates form with task data
  describe('Property 11: Edit action populates form with task data', () => {
    it('should populate form with all task data when editing', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, description, cronExpression) => {
            const testFixture = TestBed.createComponent(TaskFormComponent);
            const testComponent = testFixture.componentInstance;
            testFixture.detectChanges();
            
            // Create a mock task
            const mockTask = {
              id: crypto.randomUUID(),
              name: name,
              description: description,
              cronExpression: cronExpression,
              status: 'Active' as any
            };

            // Call editTask
            testComponent.editTask(mockTask);

            // Verify form is populated with task data
            expect(testComponent.taskForm.value.name).toBe(name);
            expect(testComponent.taskForm.value.description).toBe(description);
            expect(testComponent.taskForm.value.cronExpression).toBe(cronExpression);
            expect(testComponent.editingTask).toEqual(mockTask);
            expect(testComponent.isEditing).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
