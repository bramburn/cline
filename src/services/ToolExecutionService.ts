import { Observable, from, of, throwError } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';
import { ToolCallOptimizationAgent } from '../core/agents/ToolCallOptimizationAgent';
import { ExtensionMessage } from '../shared/ExtensionMessage';

export class ToolExecutionService {
  private toolCallOptimizationAgent: ToolCallOptimizationAgent;

  constructor(toolCallOptimizationAgent?: ToolCallOptimizationAgent) {
    this.toolCallOptimizationAgent = 
      toolCallOptimizationAgent || new ToolCallOptimizationAgent();
  }

  /**
   * Execute a tool with optimization and return an Observable
   * @param tool The tool to execute
   * @param message The extension message context
   * @returns Observable of tool execution result
   */
  executeToolWithOptimization(
    tool: any, 
    message: ExtensionMessage
  ): Observable<any> {
    return from(this.executeToolWithRetry(tool, message)).pipe(
      concatMap(result => of(result)),
      catchError(error => {
        console.error('Tool execution error:', error);
        return throwError(() => error);
      }),
      finalize(() => {
        // Cleanup or logging can be added here
        console.log('Tool execution completed');
      })
    );
  }

  /**
   * Private method to execute tool with potential retries
   * @param tool The tool to execute
   * @param message The extension message context
   * @returns Promise resolving to tool execution result
   */
  private async executeToolWithRetry(
    tool: any, 
    message: ExtensionMessage
  ): Promise<any> {
    try {
      // Optimize tool call before execution
      const optimizedTool = await this.toolCallOptimizationAgent.optimizeTool(tool);
      
      // Execute the optimized tool
      const result = await tool.execute(message);
      
      return result;
    } catch (error) {
      console.error('Error in tool execution:', error);
      throw error;
    }
  }
} 