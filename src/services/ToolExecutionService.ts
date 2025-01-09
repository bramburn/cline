import { Observable, from, of, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ExtensionMessage } from '../shared/ExtensionMessage';

export class ToolExecutionService {
  /**
   * Execute a tool and return an Observable
   * @param tool The tool to execute
   * @param message The extension message context
   * @returns Observable of tool execution result
   */
  executeToolWithOptimization(
    tool: any, 
    message: ExtensionMessage
  ): Observable<any> {
    return from(this.executeTool(tool, message)).pipe(
      catchError(error => {
        console.error('Tool execution error:', error);
        return throwError(() => error);
      }),
      finalize(() => {
        console.log('Tool execution completed');
      })
    );
  }

  /**
   * Private method to execute tool
   * @param tool The tool to execute
   * @param message The extension message context
   * @returns Promise resolving to tool execution result
   */
  private async executeTool(
    tool: any, 
    message: ExtensionMessage
  ): Promise<any> {
    try {
      // Direct tool execution without optimization
      const result = await tool.execute(message);
      return result;
    } catch (error) {
      console.error('Error in tool execution:', error);
      throw error;
    }
  }
}