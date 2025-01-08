import { Observable } from 'rxjs';

export interface TaskMetrics {
  tokenCount: number;
  cost: number;
  duration: number;
  cacheReads?: number;
  cacheWrites?: number;
}

export interface TaskState {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  metrics: TaskMetrics;
}

export interface ITaskManagementService {
  startTask(): string;
  getCurrentTask(): TaskState | null;
  pauseTask(taskId: string): void;
  resumeTask(taskId: string): void;
  endTask(taskId: string): void;
  failTask(taskId: string): void;
  getTaskState(taskId: string): TaskState | undefined;
  getTaskStateUpdates(): Observable<TaskState>;
  updateTaskMetrics(taskId: string, metrics: Partial<TaskMetrics>): void;
} 