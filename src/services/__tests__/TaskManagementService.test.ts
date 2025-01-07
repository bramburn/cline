import { TaskManagementService, TaskState } from '../TaskManagementService';
import { TaskMetricsService } from '../TaskMetricsService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('TaskManagementService', () => {
  let taskManagementService: TaskManagementService;
  let metricsService: TaskMetricsService;

  beforeEach(() => {
    metricsService = new TaskMetricsService();
    taskManagementService = new TaskManagementService(metricsService);
  });

  describe('startTask', () => {
    it('should create a new task with correct initial state', async () => {
      const task = await taskManagementService.startTask();

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.status).toBe('active');
      expect(task.startTime).toBeLessThanOrEqual(Date.now());
      expect(task.metrics).toEqual({
        tokenCount: 0,
        cost: 0,
        duration: 0
      });
    });

    it('should end current task when starting a new one', async () => {
      const firstTask = await taskManagementService.startTask();
      const secondTask = await taskManagementService.startTask();

      const firstTaskAfter = taskManagementService.getTask(firstTask.id);
      expect(firstTaskAfter?.status).toBe('completed');
      expect(secondTask.status).toBe('active');
    });
  });

  describe('pauseTask', () => {
    it('should pause an active task', async () => {
      const task = await taskManagementService.startTask();
      await taskManagementService.pauseTask(task.id);

      const pausedTask = taskManagementService.getTask(task.id);
      expect(pausedTask?.status).toBe('paused');
    });

    it('should throw error when pausing non-existent task', async () => {
      await expect(taskManagementService.pauseTask('non-existent')).rejects.toThrow();
    });
  });

  describe('resumeTask', () => {
    it('should resume a paused task', async () => {
      const task = await taskManagementService.startTask();
      await taskManagementService.pauseTask(task.id);
      await taskManagementService.resumeTask(task.id);

      const resumedTask = taskManagementService.getTask(task.id);
      expect(resumedTask?.status).toBe('active');
    });

    it('should throw error when resuming non-existent task', async () => {
      await expect(taskManagementService.resumeTask('non-existent')).rejects.toThrow();
    });
  });

  describe('endTask', () => {
    it('should complete a task and update metrics', async () => {
      const task = await taskManagementService.startTask();
      await taskManagementService.endTask(task.id);

      const endedTask = taskManagementService.getTask(task.id);
      expect(endedTask?.status).toBe('completed');
      expect(endedTask?.endTime).toBeDefined();
      expect(endedTask?.metrics.duration).toBeGreaterThan(0);
    });

    it('should throw error when ending non-existent task', async () => {
      await expect(taskManagementService.endTask('non-existent')).rejects.toThrow();
    });
  });

  describe('failTask', () => {
    it('should mark task as failed and update metrics', async () => {
      const task = await taskManagementService.startTask();
      await taskManagementService.failTask(task.id, new Error('Test error'));

      const failedTask = taskManagementService.getTask(task.id);
      expect(failedTask?.status).toBe('failed');
      expect(failedTask?.endTime).toBeDefined();
      expect(failedTask?.metrics.duration).toBeGreaterThan(0);
    });

    it('should throw error when failing non-existent task', async () => {
      await expect(taskManagementService.failTask('non-existent', new Error())).rejects.toThrow();
    });
  });

  describe('task state management', () => {
    it('should correctly track current task', async () => {
      const task = await taskManagementService.startTask();
      expect(taskManagementService.getCurrentTask()).toEqual(task);

      await taskManagementService.endTask(task.id);
      expect(taskManagementService.getCurrentTask()).toBeUndefined();
    });

    it('should maintain task history', async () => {
      const task1 = await taskManagementService.startTask();
      const task2 = await taskManagementService.startTask();

      const allTasks = taskManagementService.getAllTasks();
      expect(allTasks).toHaveLength(2);
      expect(allTasks).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: task1.id }),
        expect.objectContaining({ id: task2.id })
      ]));
    });
  });

  describe('metrics updates', () => {
    it('should update task metrics', async () => {
      const task = await taskManagementService.startTask();
      const newMetrics = {
        tokenCount: 100,
        cost: 0.5,
        cacheReads: 5,
        cacheWrites: 2
      };

      taskManagementService.updateTaskMetrics(task.id, newMetrics);
      const updatedTask = taskManagementService.getTask(task.id);

      expect(updatedTask?.metrics).toEqual({
        ...task.metrics,
        ...newMetrics
      });
    });

    it('should throw error when updating metrics for non-existent task', () => {
      expect(() => taskManagementService.updateTaskMetrics('non-existent', { tokenCount: 100 }))
        .toThrow();
    });
  });
}); 