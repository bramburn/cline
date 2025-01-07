import { describe, it, expect, beforeEach } from 'vitest';
import { StreamController } from '../StreamController';
import { firstValueFrom } from 'rxjs';

describe('StreamController', () => {
  let controller: StreamController;

  beforeEach(() => {
    controller = new StreamController();
  });

  describe('progress updates', () => {
    it('should update progress correctly', async () => {
      const progressPromise = firstValueFrom(controller.getProgressUpdates());
      controller.updateProgress(50);
      const progress = await progressPromise;

      expect(progress.status).toBe('active');
      expect(progress.progress).toBe(50);
      expect(progress.metrics).toBeDefined();
      expect(progress.metrics?.processingTime).toBeGreaterThanOrEqual(0);
      expect(progress.metrics?.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for invalid progress value', () => {
      expect(() => controller.updateProgress(-1)).toThrow('Invalid progress value');
      expect(() => controller.updateProgress(101)).toThrow('Invalid progress value');
      expect(() => controller.updateProgress('invalid' as any)).toThrow('Invalid progress value');
    });
  });

  describe('state management', () => {
    it('should handle pause correctly', async () => {
      const progressPromise = firstValueFrom(controller.getProgressUpdates());
      controller.pause();
      const progress = await progressPromise;
      expect(progress.status).toBe('paused');
    });

    it('should handle resume correctly', async () => {
      const progressPromise = firstValueFrom(controller.getProgressUpdates());
      controller.resume();
      const progress = await progressPromise;
      expect(progress.status).toBe('active');
    });

    it('should handle stop correctly', async () => {
      const progressPromise = firstValueFrom(controller.getProgressUpdates());
      controller.stop();
      const progress = await progressPromise;
      expect(progress.status).toBe('stopped');
      expect(progress.progress).toBe(100);
    });

    it('should handle error correctly', async () => {
      const testError = new Error('Test error');
      const progressPromise = firstValueFrom(controller.getProgressUpdates());
      controller.error(testError);
      const progress = await progressPromise;
      expect(progress.status).toBe('stopped');
      expect(progress.error).toBe(testError);
    });
  });

  describe('metrics tracking', () => {
    it('should track processing times correctly', async () => {
      controller.updateProgress(50);
      await new Promise(resolve => setTimeout(resolve, 100));
      const progressPromise = firstValueFrom(controller.getProgressUpdates());
      controller.stop();
      const progress = await progressPromise;
      expect(progress.metrics).toBeDefined();
      expect(progress.metrics?.processingTime).toBeGreaterThanOrEqual(0);
      expect(progress.metrics?.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });
}); 