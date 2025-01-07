import { randomUUID } from 'crypto';
import { Subject } from 'rxjs';

export interface TaskState {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  metrics: TaskMetrics;
}

export interface TaskMetrics {
  tokenCount: number;
  cost: number;
  duration: number;
  cacheReads?: number;
  cacheWrites?: number;
}

export class TaskManagementService {
  private currentTask: TaskState | null = null;
  private taskHistory = new Map<string, TaskState>();
  private taskStateSubject = new Subject<TaskState>();

  constructor() {}

  public startTask(): string {
    // End current task if it exists
    if (this.currentTask) {
      this.endTask(this.currentTask.id);
    }

    const taskId = randomUUID();
    const newTask: TaskState = {
      id: taskId,
      status: 'active',
      startTime: Date.now(),
      metrics: {
        tokenCount: 0,
        cost: 0,
        duration: 0,
      }
    };

    this.currentTask = newTask;
    this.taskHistory.set(taskId, newTask);
    this.taskStateSubject.next(newTask);
    return taskId;
  }

  public getCurrentTask(): TaskState | null {
    return this.currentTask;
  }

  public pauseTask(taskId: string): void {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'paused';
    this.taskStateSubject.next(task);
  }

  public resumeTask(taskId: string): void {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'active';
    this.taskStateSubject.next(task);
  }

  public endTask(taskId: string): void {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'completed';
    task.endTime = Date.now();
    task.metrics.duration = task.endTime - task.startTime;
    
    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
    }
    
    this.taskStateSubject.next(task);
  }

  public failTask(taskId: string): void {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'failed';
    task.endTime = Date.now();
    task.metrics.duration = task.endTime - task.startTime;
    
    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
    }
    
    this.taskStateSubject.next(task);
  }

  public getTaskState(taskId: string): TaskState | undefined {
    return this.taskHistory.get(taskId);
  }

  public getTaskStateUpdates() {
    return this.taskStateSubject.asObservable();
  }

  public updateTaskMetrics(taskId: string, metrics: Partial<TaskMetrics>): void {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.metrics = {
      ...task.metrics,
      ...metrics,
      duration: task.endTime ? task.endTime - task.startTime : Date.now() - task.startTime
    };
    
    this.taskStateSubject.next(task);
  }
} 