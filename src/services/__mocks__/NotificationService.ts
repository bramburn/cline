import { vi } from 'vitest';
import { ErrorNotification } from '../../types/ErrorReporting';

export const mockNotificationService = {
  addErrorNotification: vi.fn().mockImplementation((notification: ErrorNotification) => {
    console.log('Mock error notification:', notification);
  })
};
