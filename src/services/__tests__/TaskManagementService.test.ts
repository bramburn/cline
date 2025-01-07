import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManagementService } from '../TaskManagementService';

describe('TaskManagementService', () => {
  let service: TaskManagementService;

  beforeEach(() => {
    service = new TaskManagementService();
  });

  describe('startTask', () => {
    it('should create a new task with initial state', () => {
      const taskId = service.startTask();
      const task = service.getTaskState(taskId);

      expect(task).toBeDefined();
      expect(task?.status).toBe('active');
      expect(task?.metrics.tokenCount).toBe(0);
      expect(task?.metrics.cost).toBe(0);
      expect(task?.metrics.duration).toBe(0);
    });

    it('should end current task when starting a new one', () => {
      const firstTaskId = service.startTask();
      const secondTaskId = service.startTask();

      const firstTask = service.getTaskState(firstTaskId);
      const secondTask = service.getTaskState(secondTaskId);

      expect(firstTask?.status).toBe('completed');
      expect(secondTask?.status).toBe('active');
    });
  });

  describe('pauseTask', () => {
    it('should pause an active task', () => {
      const taskId = service.startTask();
      service.pauseTask(taskId);

      const task = service.getTaskState(taskId);
      expect(task?.status).toBe('paused');
    });

    it('should throw error when pausing non-existent task', () => {
      expect(() => service.pauseTask('non-existent')).toThrow('Task non-existent not found');
    });
  });

  describe('resumeTask', () => {
    it('should resume a paused task', () => {
      const taskId = service.startTask();
      service.pauseTask(taskId);
      service.resumeTask(taskId);

      const task = service.getTaskState(taskId);
      expect(task?.status).toBe('active');
    });

    it('should throw error when resuming non-existent task', () => {
      expect(() => service.resumeTask('non-existent')).toThrow('Task non-existent not found');
    });
  });

  describe('endTask', () => {
    it('should complete a task and update metrics', async () => {
      const taskId = service.startTask();
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait to ensure duration > 0
      service.endTask(taskId);

      const endedTask = service.getTaskState(taskId);
      expect(endedTask?.status).toBe('completed');
      expect(endedTask?.endTime).toBeDefined();
      expect(endedTask?.metrics.duration).toBeGreaterThan(0);
    });

    it('should throw error when ending non-existent task', () => {
      expect(() => service.endTask('non-existent')).toThrow('Task non-existent not found');
    });
  });

  describe('failTask', () => {
    it('should mark task as failed and update metrics', async () => {
      const taskId = service.startTask();
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait to ensure duration > 0
      service.failTask(taskId);

      const failedTask = service.getTaskState(taskId);
      expect(failedTask?.status).toBe('failed');
      expect(failedTask?.endTime).toBeDefined();
      expect(failedTask?.metrics.duration).toBeGreaterThan(0);
    });

    it('should throw error when failing non-existent task', () => {
      expect(() => service.failTask('non-existent')).toThrow('Task non-existent not found');
    });
  });

  describe('task state management', () => {
    it('should track current task correctly', () => {
      const taskId = service.startTask();
      expect(service.getCurrentTask()?.id).toBe(taskId);

      service.endTask(taskId);
      expect(service.getCurrentTask()).toBeNull();
    });

    it('should maintain task history', () => {
      const taskId1 = service.startTask();
      const taskId2 = service.startTask();

      expect(service.getTaskState(taskId1)).toBeDefined();
      expect(service.getTaskState(taskId2)).toBeDefined();
    });
  });

  describe('metrics updates', () => {
    it('should update task metrics correctly', () => {
      const taskId = service.startTask();
      service.updateTaskMetrics(taskId, {
        tokenCount: 100,
        cost: 0.1
      });

      const task = service.getTaskState(taskId);
      expect(task?.metrics.tokenCount).toBe(100);
      expect(task?.metrics.cost).toBe(0.1);
    });

    it('should throw error when updating non-existent task', () => {
      expect(() => service.updateTaskMetrics('non-existent', { tokenCount: 100 }))
        .toThrow('Task non-existent not found');
    });
  });
}); 