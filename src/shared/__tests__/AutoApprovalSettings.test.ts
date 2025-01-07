import { describe, it, expect } from 'vitest';
import { AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from '../AutoApprovalSettings';

describe('AutoApprovalSettings', () => {
  it('should have correct default settings', () => {
    const defaultSettings: AutoApprovalSettings = DEFAULT_AUTO_APPROVAL_SETTINGS;

    expect(defaultSettings.enabled).toBe(false);
    expect(defaultSettings.maxRequests).toBe(20);
    expect(defaultSettings.enableNotifications).toBe(false);

    // Check default action permissions
    expect(defaultSettings.actions.readFiles).toBe(false);
    expect(defaultSettings.actions.editFiles).toBe(false);
    expect(defaultSettings.actions.executeCommands).toBe(false);
    expect(defaultSettings.actions.useBrowser).toBe(false);
    expect(defaultSettings.actions.useMcp).toBe(false);
  });

  it('should allow creating custom auto-approval settings', () => {
    const customSettings: AutoApprovalSettings = {
      enabled: true,
      actions: {
        readFiles: true,
        editFiles: false,
        executeCommands: true,
        useBrowser: false,
        useMcp: false,
      },
      maxRequests: 10,
      enableNotifications: true,
    };

    expect(customSettings.enabled).toBe(true);
    expect(customSettings.maxRequests).toBe(10);
    expect(customSettings.enableNotifications).toBe(true);
    expect(customSettings.actions.readFiles).toBe(true);
    expect(customSettings.actions.executeCommands).toBe(true);
  });
}); 