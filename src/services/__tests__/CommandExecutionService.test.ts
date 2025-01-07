import { describe, it, expect, vi } from 'vitest';
import { CommandExecutionService } from '../CommandExecutionService';

describe('CommandExecutionService', () => {
  let commandService: CommandExecutionService;

  beforeEach(() => {
    commandService = new CommandExecutionService();
  });

  it('should execute a simple command', async () => {
    const result = await commandService.executeCommand('echo', ['Hello, World!']);
    
    expect(result.stdout).toContain('Hello, World!');
    expect(result.exitCode).toBe(0);
  });

  it('should stream command output', async () => {
    const outputCallback = vi.fn();
    commandService.onOutput(outputCallback);

    await commandService.executeCommand('echo', ['Streaming test']);

    expect(outputCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'stdout',
        data: 'Streaming test'
      })
    );

    commandService.removeOutputListener(outputCallback);
  });

  it('should handle command interruption', async () => {
    const longRunningCommand = commandService.executeCommand('sleep', ['10']);
    
    const interrupted = commandService.interruptCommand();
    expect(interrupted).toBe(true);

    await expect(longRunningCommand).rejects.toThrow();
  });

  it('should handle command errors', async () => {
    await expect(commandService.executeCommand('non_existent_command'))
      .rejects.toThrow();
  });
}); 