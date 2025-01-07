import { NotificationService } from '../NotificationService';
import { ErrorCategory } from '../../types/ErrorReporting';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  describe('addNotification', () => {
    it('should add a notification and return its id', () => {
      const notification = {
        type: 'error' as const,
        message: 'Test error',
        dismissible: true,
      };

      const id = notificationService.addNotification(notification);
      const notifications = notificationService.getNotifications();

      expect(id).toBeDefined();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        ...notification,
        id,
        timestamp: expect.any(Number),
      });
    });

    it('should remove oldest notification when max limit is reached', () => {
      const notifications = Array.from({ length: 6 }, (_, i) => ({
        type: 'info' as const,
        message: `Test notification ${i}`,
        dismissible: true,
      }));

      const ids = notifications.map(n => notificationService.addNotification(n));
      const activeNotifications = notificationService.getNotifications();

      expect(activeNotifications).toHaveLength(5);
      expect(activeNotifications.map(n => n.id)).not.toContain(ids[0]);
    });

    it('should auto-close notification after specified time', async () => {
      const notification = {
        type: 'success' as const,
        message: 'Test success',
        dismissible: true,
        autoClose: 100,
      };

      notificationService.addNotification(notification);
      expect(notificationService.getNotifications()).toHaveLength(1);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(notificationService.getNotifications()).toHaveLength(0);
    });
  });

  describe('removeNotification', () => {
    it('should remove notification by id', () => {
      const id = notificationService.addNotification({
        type: 'warning' as const,
        message: 'Test warning',
        dismissible: true,
      });

      expect(notificationService.getNotifications()).toHaveLength(1);
      notificationService.removeNotification(id);
      expect(notificationService.getNotifications()).toHaveLength(0);
    });
  });

  describe('error notifications', () => {
    it('should create error notification from ErrorReport', () => {
      const id = notificationService.addErrorNotification({
        category: ErrorCategory.TIMEOUT,
        message: 'Operation timed out',
        context: {
          toolName: 'browser_action',
          parameters: { timeout: '30000' },
          timestamp: Date.now(),
          retryCount: 0,
        },
        suggestions: [{
          toolName: 'browser_action',
          suggestedParameters: { timeout: '60000' },
          confidence: 0.8,
          reasoning: 'Increase timeout',
        }],
      });

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'error',
        message: 'Operation timed out',
        dismissible: true,
        actionLabel: 'View Suggestions',
      });
    });
  });

  describe('task notifications', () => {
    it('should create task completion notification', () => {
      const id = notificationService.addTaskCompletionNotification('Test Task');
      const notifications = notificationService.getNotifications();

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'success',
        message: 'Task "Test Task" completed successfully',
        dismissible: true,
        autoClose: 5000,
      });
    });

    it('should create limit reached notification', () => {
      const id = notificationService.addLimitReachedNotification('API Rate');
      const notifications = notificationService.getNotifications();

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'warning',
        message: 'API Rate limit reached',
        dismissible: true,
      });
    });

    it('should create checkpoint notification', () => {
      const id = notificationService.addCheckpointNotification('Saved');
      const notifications = notificationService.getNotifications();

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'info',
        message: 'Checkpoint operation: Saved',
        dismissible: true,
        autoClose: 3000,
      });
    });
  });
}); 