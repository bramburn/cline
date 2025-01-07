import { BehaviorSubject } from 'rxjs';

export interface StreamProgress {
  status: 'active' | 'paused' | 'stopped';
  progress: number;
  error?: Error;
  metrics?: {
    processingTime: number;
    averageProcessingTime: number;
  };
}

export class StreamController {
  private progressSubject = new BehaviorSubject<StreamProgress>({
    status: 'active',
    progress: 0
  });
  private startTime: number | null = null;
  private processingTimes: number[] = [];

  constructor() {}

  public updateProgress(progress: number): void {
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      throw new Error('Invalid progress value');
    }
    this.emitProgress('active', progress);
  }

  public pause(): void {
    this.emitProgress('paused', this.getCurrentProgress());
  }

  public resume(): void {
    this.emitProgress('active', this.getCurrentProgress());
  }

  public stop(): void {
    this.emitProgress('stopped', 100);
    this.recordProcessingTime();
  }

  public error(error: Error): void {
    this.progressSubject.next({
      status: 'stopped',
      progress: this.getCurrentProgress(),
      error
    });
  }

  public getProgressUpdates() {
    return this.progressSubject.asObservable();
  }

  private getCurrentProgress(): number {
    return this.progressSubject.value.progress;
  }

  private emitProgress(status: 'active' | 'paused' | 'stopped', progress: number): void {
    if (!this.startTime && status === 'active') {
      this.startTime = Date.now();
    }

    this.progressSubject.next({
      status,
      progress,
      metrics: this.calculateMetrics()
    });

    if (status === 'stopped') {
      this.recordProcessingTime();
    }
  }

  private recordProcessingTime(): void {
    if (this.startTime) {
      const processingTime = Date.now() - this.startTime;
      this.processingTimes.push(processingTime);
      this.startTime = null;
    }
  }

  private calculateMetrics(): { processingTime: number; averageProcessingTime: number } {
    const currentProcessingTime = this.startTime ? Date.now() - this.startTime : 0;
    const totalProcessingTime = this.processingTimes.reduce((sum, time) => sum + time, 0) + currentProcessingTime;
    const averageProcessingTime = this.processingTimes.length > 0 
      ? totalProcessingTime / (this.processingTimes.length + (this.startTime ? 1 : 0))
      : currentProcessingTime;

    return {
      processingTime: currentProcessingTime,
      averageProcessingTime
    };
  }
} 