import { describe, it, expect, vi } from 'vitest';
import { ToolExecutionService } from '../ToolExecutionService';
import { ExtensionMessage } from '../../shared/ExtensionMessage';
import { firstValueFrom } from 'rxjs';

describe('ToolExecutionService', () => {
  const mockTool = {
    execute: vi.fn()
  };

  const mockMessage: ExtensionMessage = {} as ExtensionMessage;

  it('should execute a tool successfully', async () => {
    const expectedResult = { success: true };
    mockTool.execute.mockResolvedValue(expectedResult);

    const service = new ToolExecutionService();
    const observable = service.executeToolWithOptimization(mockTool, mockMessage);
    
    const result = await firstValueFrom(observable);
    
    expect(result).toEqual(expectedResult);
    expect(mockTool.execute).toHaveBeenCalledWith(mockMessage);
  });

  it('should handle tool execution errors', async () => {
    const mockError = new Error('Tool execution failed');
    mockTool.execute.mockRejectedValue(mockError);

    const service = new ToolExecutionService();
    const observable = service.executeToolWithOptimization(mockTool, mockMessage);
    
    await expect(firstValueFrom(observable)).rejects.toThrow('Tool execution failed');
  });

  it('should log completion', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    mockTool.execute.mockResolvedValue({ success: true });

    const service = new ToolExecutionService();
    const observable = service.executeToolWithOptimization(mockTool, mockMessage);
    
    await firstValueFrom(observable);
    
    expect(consoleSpy).toHaveBeenCalledWith('Tool execution completed');
  });
});
