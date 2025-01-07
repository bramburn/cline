import { makeAutoObservable } from 'mobx';
import { ErrorReport } from '../types/ErrorReporting';

export interface Notification {
  id: string;
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  timestamp: number;
  dismissible: boolean;
  autoClose?: number; // Time in ms after which notification auto-closes
  actionLabel?: string;
  onAction?: () => void;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private maxNotifications: number = 5;

  constructor() {
    makeAutoObservable(this);
  }

  public addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    const id = crypto.randomUUID();
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
    };

    if (this.notifications.size >= this.maxNotifications) {
      // Remove oldest notification
      const oldestId = Array.from(this.notifications.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.notifications.delete(oldestId);
    }

    this.notifications.set(id, fullNotification);

    if (notification.autoClose) {
      setTimeout(() => this.removeNotification(id), notification.autoClose);
    }

    return id;
  }

  public removeNotification(id: string): void {
    this.notifications.delete(id);
  }

  public getNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public addErrorNotification(error: ErrorReport): string {
    return this.addNotification({
      type: 'error',
      message: error.message,
      dismissible: true,
      actionLabel: error.suggestions.length > 0 ? 'View Suggestions' : undefined,
      onAction: error.suggestions.length > 0 ? () => {
        // Handle showing suggestions
        console.log('Show suggestions:', error.suggestions);
      } : undefined,
    });
  }

  public addTaskCompletionNotification(taskName: string): string {
    return this.addNotification({
      type: 'success',
      message: `Task "${taskName}" completed successfully`,
      dismissible: true,
      autoClose: 5000,
    });
  }

  public addLimitReachedNotification(limitType: string): string {
    return this.addNotification({
      type: 'warning',
      message: `${limitType} limit reached`,
      dismissible: true,
    });
  }

  public addCheckpointNotification(result: string): string {
    return this.addNotification({
      type: 'info',
      message: `Checkpoint operation: ${result}`,
      dismissible: true,
      autoClose: 3000,
    });
  }
} 