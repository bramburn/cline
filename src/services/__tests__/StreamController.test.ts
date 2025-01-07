import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreamController } from '../StreamController';
import { firstValueFrom } from 'rxjs';

describe('StreamController', () => {
  let controller: StreamController;

  beforeEach(() => {
    controller = new StreamController();
    vi.useFakeTimers();
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  it('should initialize with idle status', async () => {
    const progress = await firstValueFrom(controller.getProgress());
    expect(progress.status).toBe('idle');
    expect(progress.processed).toBe(0);
  });

  it('should update progress', async () => {
    controller.updateProgress({ 
      processed: 5, 
      total: 10, 
      status: 'processing' 
    });

    const progress = await firstValueFrom(controller.getProgress());
    expect(progress.processed).toBe(5);
    expect(progress.total).toBe(10);
    expect(progress.status).toBe('processing');
  });

  it('should pause and resume processing', async () => {
    controller.updateProgress({ status: 'processing' });
    controller.pause();

    const pausedProgress = await firstValueFrom(controller.getProgress());
    expect(pausedProgress.status).toBe('paused');

    controller.resume();
    const resumedProgress = await firstValueFrom(controller.getProgress());
    expect(resumedProgress.status).toBe('processing');
  });

  it('should stop processing', async () => {
    controller.updateProgress({ status: 'processing' });
    controller.stop();

    const stoppedProgress = await firstValueFrom(controller.getProgress());
    expect(stoppedProgress.status).toBe('completed');
  });

  it('should record processing times', async () => {
    controller.recordProcessingTime(100);
    controller.recordProcessingTime(200);
    controller.recordProcessingTime(150);

    const metrics = await firstValueFrom(controller.getMetrics());
    expect(metrics.averageProcessingTime).toBe(150);
  });

  it('should track error count', async () => {
    controller.updateProgress({ status: 'error' });
    controller.updateProgress({ status: 'error' });

    const metrics = await firstValueFrom(controller.getMetrics());
    expect(metrics.errorCount).toBe(2);
  });

  it('should limit processing times history', async () => {
    // Add more than 100 processing times
    for (let i = 0; i < 150; i++) {
      controller.recordProcessingTime(i);
    }

    const metrics = await firstValueFrom(controller.getMetrics());
    expect(metrics.averageProcessingTime).toBeCloseTo(124.5);
  });

  it('should reset state', async () => {
    controller.updateProgress({ 
      processed: 10, 
      status: 'processing', 
      error: 'Test error' 
    });
    controller.recordProcessingTime(200);

    controller.reset();

    const progress = await firstValueFrom(controller.getProgress());
    const metrics = await firstValueFrom(controller.getMetrics());

    expect(progress.processed).toBe(0);
    expect(progress.status).toBe('idle');
    expect(metrics.processedCount).toBe(0);
    expect(metrics.errorCount).toBe(0);
    expect(metrics.averageProcessingTime).toBe(0);
  });

  it('should provide current progress and metrics synchronously', () => {
    controller.updateProgress({ 
      processed: 5, 
      total: 10, 
      status: 'processing' 
    });
    controller.recordProcessingTime(100);

    const currentProgress = controller.getCurrentProgress();
    const currentMetrics = controller.getCurrentMetrics();

    expect(currentProgress.processed).toBe(5);
    expect(currentProgress.status).toBe('processing');
    expect(currentMetrics.processedCount).toBe(5);
    expect(currentMetrics.averageProcessingTime).toBe(100);
  });
}); 