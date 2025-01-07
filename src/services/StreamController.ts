import { BehaviorSubject, Observable, Subject, Subscription, timer } from 'rxjs';
import { filter, map, takeUntil, tap } from 'rxjs/operators';

export interface StreamProgress {
  processed: number;
  total?: number;
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'error';
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface StreamMetrics {
  processedCount: number;
  errorCount: number;
  averageProcessingTime: number;
  startTime?: number;
  endTime?: number;
}

export class StreamController {
  private pauseSubject = new BehaviorSubject<boolean>(false);
  private stopSubject = new Subject<void>();
  private progressSubject = new BehaviorSubject<StreamProgress>({
    processed: 0,
    status: 'idle'
  });
  private metricsSubject = new BehaviorSubject<StreamMetrics>({
    processedCount: 0,
    errorCount: 0,
    averageProcessingTime: 0
  });

  private processingTimes: number[] = [];
  private activeSubscriptions: Subscription[] = [];

  constructor() {
    // Start metrics collection
    this.initializeMetricsCollection();
  }

  private initializeMetricsCollection(): void {
    const metricsInterval = timer(0, 1000).pipe(
      takeUntil(this.stopSubject),
      filter(() => this.progressSubject.value.status === 'processing')
    ).subscribe(() => {
      this.updateMetrics();
    });

    this.activeSubscriptions.push(metricsInterval);
  }

  private updateMetrics(): void {
    const currentMetrics = this.metricsSubject.value;
    const progress = this.progressSubject.value;

    if (progress.status === 'processing') {
      this.metricsSubject.next({
        ...currentMetrics,
        processedCount: progress.processed,
        averageProcessingTime: this.calculateAverageProcessingTime()
      });
    }
  }

  private calculateAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) {
      return 0;
    }
    const sum = this.processingTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.processingTimes.length;
  }

  pause(): void {
    if (this.progressSubject.value.status === 'processing') {
      this.pauseSubject.next(true);
      this.progressSubject.next({
        ...this.progressSubject.value,
        status: 'paused'
      });
    }
  }

  resume(): void {
    if (this.progressSubject.value.status === 'paused') {
      this.pauseSubject.next(false);
      this.progressSubject.next({
        ...this.progressSubject.value,
        status: 'processing'
      });
    }
  }

  stop(): void {
    this.stopSubject.next();
    this.progressSubject.next({
      ...this.progressSubject.value,
      status: 'completed'
    });
  }

  isPaused(): Observable<boolean> {
    return this.pauseSubject.asObservable();
  }

  updateProgress(progress: Partial<StreamProgress>): void {
    const currentProgress = this.progressSubject.value;
    this.progressSubject.next({
      ...currentProgress,
      ...progress
    });

    if (progress.status === 'error') {
      const currentMetrics = this.metricsSubject.value;
      this.metricsSubject.next({
        ...currentMetrics,
        errorCount: currentMetrics.errorCount + 1
      });
    }
  }

  recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);
    // Keep only last 100 processing times to avoid memory growth
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
  }

  getProgress(): Observable<StreamProgress> {
    return this.progressSubject.asObservable();
  }

  getMetrics(): Observable<StreamMetrics> {
    return this.metricsSubject.asObservable();
  }

  getCurrentProgress(): StreamProgress {
    return this.progressSubject.value;
  }

  getCurrentMetrics(): StreamMetrics {
    return this.metricsSubject.value;
  }

  reset(): void {
    this.processingTimes = [];
    this.progressSubject.next({
      processed: 0,
      status: 'idle'
    });
    this.metricsSubject.next({
      processedCount: 0,
      errorCount: 0,
      averageProcessingTime: 0
    });
  }

  dispose(): void {
    this.stopSubject.next();
    this.stopSubject.complete();
    this.pauseSubject.complete();
    this.progressSubject.complete();
    this.metricsSubject.complete();
    
    this.activeSubscriptions.forEach(sub => sub.unsubscribe());
    this.activeSubscriptions = [];
  }
} 