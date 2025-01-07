import { describe, it, expect, beforeEach } from 'vitest';
import { StreamController } from '../StreamController';
import { firstValueFrom } from 'rxjs';

describe('StreamController', () => {
  let controller: StreamController;

  beforeEach(() => {
    controller = new StreamController();
  });

  it('should initialize with idle status', async () => {
    const progress = await firstValueFrom(controller.getProgress());
    expect(progress.status).toBe('idle');
    expect(progress.processed).toBe(0);
  });

  it('should update progress', async () => {
    controller.updateProgress(5, 10);
    const progress = await firstValueFrom(controller.getProgress());
    expect(progress.processed).toBe(5);
    expect(progress.total).toBe(10);
    expect(progress.status).toBe('processing');
  });

  it('should pause and resume processing', async () => {
    controller.pause();
    let progress = await firstValueFrom(controller.getProgress());
    expect(progress.status).toBe('paused');

    controller.resume();
    progress = await firstValueFrom(controller.getProgress());
    expect(progress.status).toBe('processing');
  });

  it('should stop processing', async () => {
    controller.stop();
    const progress = await firstValueFrom(controller.getProgress());
    expect(progress.status).toBe('stopped');
  });

  it('should record processing times', async () => {
    controller.startProcessing();
    await new Promise(resolve => setTimeout(resolve, 100));
    controller.endProcessing();

    const metrics = await firstValueFrom(controller.getMetrics());
    expect(metrics.averageProcessingTime).toBeGreaterThan(0);
  });

  it('should track error count', async () => {
    controller.incrementErrorCount();
    controller.incrementErrorCount();

    const metrics = await firstValueFrom(controller.getMetrics());
    expect(metrics.errorCount).toBe(2);
  });

  it('should limit processing times history', async () => {
    for (let i = 0; i < 5; i++) {
      controller.startProcessing();
      await new Promise(resolve => setTimeout(resolve, 100));
      controller.endProcessing();
    }

    const metrics = await firstValueFrom(controller.getMetrics());
    expect(metrics.averageProcessingTime).toBeGreaterThan(0);
  });

  it('should reset state', async () => {
    controller.updateProgress(5, 10);
    controller.incrementErrorCount();
    controller.startProcessing();
    await new Promise(resolve => setTimeout(resolve, 100));
    controller.endProcessing();

    controller.reset();

    const progress = await firstValueFrom(controller.getProgress());
    const metrics = await firstValueFrom(controller.getMetrics());

    expect(progress.status).toBe('idle');
    expect(progress.processed).toBe(0);
    expect(metrics.errorCount).toBe(0);
    expect(metrics.averageProcessingTime).toBe(0);
  });

  it('should provide current progress and metrics synchronously', () => {
    controller.updateProgress(5, 10);
    controller.incrementErrorCount();
    controller.startProcessing();

    const currentProgress = controller.getCurrentProgress();
    const currentMetrics = controller.getCurrentMetrics();

    expect(currentProgress.processed).toBe(5);
    expect(currentProgress.status).toBe('processing');
    expect(currentMetrics.errorCount).toBe(1);
    expect(currentMetrics.averageProcessingTime).toBe(0);
  });
}); 