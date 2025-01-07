import { ErrorReportingService } from '../ErrorReportingService';
import { ToolCallPatternAnalyzer } from '../ToolCallPatternAnalyzer';
import { ErrorCategory, ToolCallPattern } from '../../types/ToolCallOptimization';

describe('ErrorReportingService', () => {
  let service: ErrorReportingService;
  let patternAnalyzer: ToolCallPatternAnalyzer;

  beforeEach(() => {
    patternAnalyzer = new ToolCallPatternAnalyzer();
    service = new ErrorReportingService(patternAnalyzer);
  });

  const createPattern = (
    toolName: 'read_file' | 'search_files',
    retryCount: number = 0
  ): ToolCallPattern => ({
    toolName,
    parameters: { path: './test.txt' },
    outcome: {
      success: false,
      duration: 100,
      errorMessage: 'Error occurred'
    },
    timestamp: Date.now(),
    retryCount,
    errorType: ErrorCategory.UNKNOWN
  });

  describe('error report generation', () => {
    it('should generate error report with correct structure', () => {
      const error = new Error('File not found');
      const pattern = createPattern('read_file');
      
      const report = service.generateErrorReport(
        error,
        'read_file',
        { path: './test.txt' },
        pattern
      );

      expect(report).toMatchObject({
        category: expect.any(String),
        message: expect.stringContaining('File not found'),
        context: {
          toolName: 'read_file',
          parameters: { path: './test.txt' },
          timestamp: expect.any(Number),
          retryCount: 0
        },
        suggestions: expect.any(Array)
      });
    });

    it('should categorize errors correctly', () => {
      const testCases = [
        {
          error: new Error('Invalid parameter format'),
          expectedCategory: ErrorCategory.INVALID_PARAMETER
        },
        {
          error: new Error('Missing required parameter'),
          expectedCategory: ErrorCategory.MISSING_PARAMETER
        },
        {
          error: new Error('Permission denied'),
          expectedCategory: ErrorCategory.PERMISSION_DENIED
        },
        {
          error: new Error('Resource not found'),
          expectedCategory: ErrorCategory.RESOURCE_NOT_FOUND
        },
        {
          error: new Error('Operation timed out'),
          expectedCategory: ErrorCategory.TIMEOUT
        },
        {
          error: new Error('Unknown error'),
          expectedCategory: ErrorCategory.UNKNOWN
        }
      ];

      testCases.forEach(({ error, expectedCategory }) => {
        const pattern = createPattern('read_file');
        const report = service.generateErrorReport(
          error,
          'read_file',
          { path: './test.txt' },
          pattern
        );
        expect(report.category).toBe(expectedCategory);
      });
    });

    it('should include retry count in context', () => {
      const error = new Error('Operation failed');
      const pattern = createPattern('read_file', 2);
      
      const report = service.generateErrorReport(
        error,
        'read_file',
        { path: './test.txt' },
        pattern
      );

      expect(report.context.retryCount).toBe(2);
    });

    it('should generate appropriate suggestions for invalid parameters', () => {
      const error = new Error('Invalid parameter format');
      const pattern = createPattern('search_files');
      
      const report = service.generateErrorReport(
        error,
        'search_files',
        { path: './', regex: '*.txt' },
        pattern
      );

      expect(report.suggestions).toContainEqual(expect.objectContaining({
        toolName: 'search_files',
        suggestedParameters: expect.objectContaining({
          regex: '\\*\\.txt'
        })
      }));
    });

    it('should generate appropriate suggestions for missing parameters', () => {
      const error = new Error('Missing required parameter');
      const pattern = createPattern('read_file');
      
      const report = service.generateErrorReport(
        error,
        'read_file',
        {},
        pattern
      );

      expect(report.suggestions).toContainEqual(expect.objectContaining({
        toolName: 'read_file',
        suggestedParameters: expect.objectContaining({
          path: expect.any(String)
        })
      }));
    });

    it('should generate appropriate suggestions for resource not found', () => {
      const error = new Error('Resource not found');
      const pattern = createPattern('read_file');
      
      const report = service.generateErrorReport(
        error,
        'read_file',
        { path: 'deep/nested/file.txt' },
        pattern
      );

      expect(report.suggestions).toContainEqual(expect.objectContaining({
        toolName: 'read_file',
        suggestedParameters: expect.objectContaining({
          path: 'deep/nested'
        })
      }));
    });
  });

  describe('history management', () => {
    it('should maintain error history', () => {
      const error = new Error('Test error');
      const pattern = createPattern('read_file');
      
      service.generateErrorReport(
        error,
        'read_file',
        { path: './test.txt' },
        pattern
      );

      const history = service.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        message: expect.stringContaining('Test error'),
        context: {
          toolName: 'read_file'
        }
      });
    });

    it('should clear error history', () => {
      const error = new Error('Test error');
      const pattern = createPattern('read_file');
      
      service.generateErrorReport(
        error,
        'read_file',
        { path: './test.txt' },
        pattern
      );

      expect(service.getErrorHistory()).toHaveLength(1);
      
      service.clearHistory();
      expect(service.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('suggestion generation', () => {
    it('should combine pattern analysis suggestions with error-specific suggestions', () => {
      // Add some successful patterns to the analyzer
      patternAnalyzer.addPatterns([
        {
          toolName: 'read_file',
          parameters: { path: './successful.txt' },
          outcome: { success: true, duration: 100 },
          timestamp: Date.now(),
          retryCount: 0
        }
      ]);

      const error = new Error('Resource not found');
      const pattern = createPattern('read_file');
      
      const report = service.generateErrorReport(
        error,
        'read_file',
        { path: 'failed/test.txt' },
        pattern
      );

      // Should include both pattern-based and error-specific suggestions
      expect(report.suggestions.some(s => 
        s.suggestedParameters.path === './successful.txt'
      )).toBe(true);
      expect(report.suggestions.some(s => 
        s.suggestedParameters.path === 'failed'
      )).toBe(true);
    });
  });
}); 