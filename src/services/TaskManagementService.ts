import { Observable, Subject } from 'rxjs';
import { TaskMetricsService } from './TaskMetricsService';

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
  private currentTask?: TaskState;
  private taskHistory: Map<string, TaskState> = new Map();
  private metricsService: TaskMetricsService;
  private taskStateSubject = new Subject<TaskState>();

  constructor(metricsService: TaskMetricsService) {
    this.metricsService = metricsService;
  }

  async startTask(): Promise<TaskState> {
    // End current task if exists
    if (this.currentTask) {
      await this.endTask(this.currentTask.id);
    }

    const newTask: TaskState = {
      id: crypto.randomUUID(),
      status: 'active',
      startTime: Date.now(),
      metrics: {
        tokenCount: 0,
        cost: 0,
        duration: 0
      }
    };

    this.currentTask = newTask;
    this.taskHistory.set(newTask.id, newTask);
    this.taskStateSubject.next(newTask);

    return newTask;
  }

  async pauseTask(taskId: string): Promise<void> {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'paused';
    this.taskStateSubject.next(task);
  }

  async resumeTask(taskId: string): Promise<void> {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'active';
    this.currentTask = task;
    this.taskStateSubject.next(task);
  }

  async endTask(taskId: string): Promise<void> {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'completed';
    task.endTime = Date.now();
    task.metrics.duration = task.endTime - task.startTime;
    
    if (this.currentTask?.id === taskId) {
      this.currentTask = undefined;
    }

    this.taskStateSubject.next(task);
  }

  async failTask(taskId: string, error: Error): Promise<void> {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'failed';
    task.endTime = Date.now();
    task.metrics.duration = task.endTime - task.startTime;

    if (this.currentTask?.id === taskId) {
      this.currentTask = undefined;
    }

    this.taskStateSubject.next(task);
  }

  getCurrentTask(): TaskState | undefined {
    return this.currentTask;
  }

  getTask(taskId: string): TaskState | undefined {
    return this.taskHistory.get(taskId);
  }

  getAllTasks(): TaskState[] {
    return Array.from(this.taskHistory.values());
  }

  getTaskStateObservable(): Observable<TaskState> {
    return this.taskStateSubject.asObservable();
  }

  updateTaskMetrics(taskId: string, metrics: Partial<TaskMetrics>): void {
    const task = this.taskHistory.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.metrics = {
      ...task.metrics,
      ...metrics
    };

    this.taskStateSubject.next(task);
  }
} 