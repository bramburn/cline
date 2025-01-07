import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { StreamController, StreamProgress, StreamMetrics } from '../StreamController';

describe('StreamController', () => {
  let controller: StreamController;

  beforeEach(() => {
    vi.useFakeTimers();
    controller = new StreamController();
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  describe('Progress Management', () => {
    it('should initialize with idle status', async () => {
      const progress = await firstValueFrom(controller.getProgress());
      expect(progress).toEqual({
        processed: 0,
        status: 'idle'
      });
    });

    it('should update progress correctly', async () => {
      const update: Partial<StreamProgress> = {
        processed: 5,
        total: 10,
        status: 'processing'
      };

      controller.updateProgress(update);
      const progress = await firstValueFrom(controller.getProgress());

      expect(progress).toEqual({
        processed: 5,
        total: 10,
        status: 'processing'
      });
    });

    it('should maintain previous values when partial update', async () => {
      controller.updateProgress({
        processed: 5,
        total: 10,
        status: 'processing'
      });

      controller.updateProgress({
        processed: 6
      });

      const progress = await firstValueFrom(controller.getProgress());
      expect(progress).toEqual({
        processed: 6,
        total: 10,
        status: 'processing'
      });
    });
  });

  describe('Stream Control', () => {
    it('should pause processing', async () => {
      controller.updateProgress({ status: 'processing' });
      controller.pause();

      const isPaused = await firstValueFrom(controller.isPaused());
      const progress = await firstValueFrom(controller.getProgress());

      expect(isPaused).toBe(true);
      expect(progress.status).toBe('paused');
    });

    it('should resume processing', async () => {
      controller.updateProgress({ status: 'processing' });
      controller.pause();
      controller.resume();

      const isPaused = await firstValueFrom(controller.isPaused());
      const progress = await firstValueFrom(controller.getProgress());

      expect(isPaused).toBe(false);
      expect(progress.status).toBe('processing');
    });

    it('should stop processing', async () => {
      controller.updateProgress({ status: 'processing' });
      controller.stop();

      const progress = await firstValueFrom(controller.getProgress());
      expect(progress.status).toBe('completed');
    });

    it('should ignore pause when not processing', async () => {
      controller.pause();
      const progress = await firstValueFrom(controller.getProgress());
      expect(progress.status).toBe('idle');
    });

    it('should ignore resume when not paused', async () => {
      controller.resume();
      const progress = await firstValueFrom(controller.getProgress());
      expect(progress.status).toBe('idle');
    });
  });

  describe('Metrics Collection', () => {
    it('should track processing times', async () => {
      controller.recordProcessingTime(100);
      controller.recordProcessingTime(200);
      controller.updateProgress({ status: 'processing' });

      // Advance timer to trigger metrics update
      vi.advanceTimersByTime(1000);

      const metrics = await firstValueFrom(controller.getMetrics());
      expect(metrics.averageProcessingTime).toBe(150);
    });

    it('should limit processing time history', async () => {
      // Add more than 100 processing times
      for (let i = 0; i < 110; i++) {
        controller.recordProcessingTime(100);
      }

      controller.updateProgress({ status: 'processing' });
      vi.advanceTimersByTime(1000);

      const metrics = await firstValueFrom(controller.getMetrics());
      expect(metrics.averageProcessingTime).toBe(100);
    });

    it('should track error count', async () => {
      controller.updateProgress({ status: 'error' });
      controller.updateProgress({ status: 'error' });

      const metrics = await firstValueFrom(controller.getMetrics());
      expect(metrics.errorCount).toBe(2);
    });

    it('should update processed count', async () => {
      controller.updateProgress({
        status: 'processing',
        processed: 5
      });

      vi.advanceTimersByTime(1000);

      const metrics = await firstValueFrom(controller.getMetrics());
      expect(metrics.processedCount).toBe(5);
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset all values', async () => {
      controller.updateProgress({
        processed: 5,
        status: 'processing'
      });
      controller.recordProcessingTime(100);

      controller.reset();

      const progress = await firstValueFrom(controller.getProgress());
      const metrics = await firstValueFrom(controller.getMetrics());

      expect(progress).toEqual({
        processed: 0,
        status: 'idle'
      });

      expect(metrics).toEqual({
        processedCount: 0,
        errorCount: 0,
        averageProcessingTime: 0
      });
    });

    it('should cleanup subscriptions on dispose', async () => {
      controller.updateProgress({ status: 'processing' });
      controller.dispose();

      // Advance timer to verify metrics aren't being updated
      vi.advanceTimersByTime(1000);

      // Attempting to get metrics after dispose should not error
      // but the subscription should be completed
      const metricsPromise = firstValueFrom(controller.getMetrics());
      await expect(metricsPromise).resolves.toBeDefined();
    });
  });

  describe('Current State Access', () => {
    it('should provide current progress synchronously', () => {
      controller.updateProgress({
        processed: 5,
        status: 'processing'
      });

      const progress = controller.getCurrentProgress();
      expect(progress.processed).toBe(5);
      expect(progress.status).toBe('processing');
    });

    it('should provide current metrics synchronously', () => {
      controller.updateProgress({ status: 'error' });
      const metrics = controller.getCurrentMetrics();
      expect(metrics.errorCount).toBe(1);
    });
  });
}); 