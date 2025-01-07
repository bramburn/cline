import { ToolCallPatternAnalyzer } from '../ToolCallPatternAnalyzer';
import { ErrorCategory, ToolCallPattern } from '../../types/ToolCallOptimization';

describe('ToolCallPatternAnalyzer', () => {
  let analyzer: ToolCallPatternAnalyzer;

  beforeEach(() => {
    analyzer = new ToolCallPatternAnalyzer();
  });

  const createPattern = (
    toolName: 'read_file' | 'search_files',
    success: boolean,
    parameters: Record<string, string>,
    errorType?: ErrorCategory
  ): ToolCallPattern => ({
    toolName,
    parameters,
    outcome: {
      success,
      duration: 100,
      errorMessage: errorType ? `Error: ${errorType}` : undefined
    },
    timestamp: Date.now(),
    retryCount: 0,
    errorType
  });

  describe('pattern analysis', () => {
    it('should return empty analysis for no patterns', () => {
      const analysis = analyzer.analyzePatterns('read_file');
      
      expect(analysis.successRate).toBe(0);
      expect(analysis.averageDuration).toBe(0);
      expect(analysis.commonErrors).toHaveLength(0);
      expect(analysis.suggestions).toHaveLength(0);
    });

    it('should calculate correct success rate and average duration', () => {
      analyzer.addPatterns([
        createPattern('read_file', true, { path: './test1.txt' }),
        createPattern('read_file', false, { path: './test2.txt' }, ErrorCategory.RESOURCE_NOT_FOUND),
        createPattern('read_file', true, { path: './test3.txt' })
      ]);

      const analysis = analyzer.analyzePatterns('read_file');
      
      expect(analysis.successRate).toBe(2/3);
      expect(analysis.averageDuration).toBe(100);
    });

    it('should identify common errors', () => {
      analyzer.addPatterns([
        createPattern('read_file', false, { path: './test1.txt' }, ErrorCategory.RESOURCE_NOT_FOUND),
        createPattern('read_file', false, { path: './test2.txt' }, ErrorCategory.RESOURCE_NOT_FOUND),
        createPattern('read_file', false, { path: './test3.txt' }, ErrorCategory.PERMISSION_DENIED)
      ]);

      const analysis = analyzer.analyzePatterns('read_file');
      
      expect(analysis.commonErrors).toHaveLength(2);
      expect(analysis.commonErrors[0]).toEqual({
        category: ErrorCategory.RESOURCE_NOT_FOUND,
        count: 2
      });
      expect(analysis.commonErrors[1]).toEqual({
        category: ErrorCategory.PERMISSION_DENIED,
        count: 1
      });
    });

    it('should generate suggestions based on successful patterns', () => {
      analyzer.addPatterns([
        createPattern('read_file', true, { path: './test.txt' }),
        createPattern('read_file', true, { path: './test.txt' }),
        createPattern('read_file', false, { path: 'test.txt' }, ErrorCategory.RESOURCE_NOT_FOUND)
      ]);

      const analysis = analyzer.analyzePatterns('read_file');
      
      expect(analysis.suggestions).toHaveLength(1);
      expect(analysis.suggestions[0]).toMatchObject({
        toolName: 'read_file',
        suggestedParameters: { path: './test.txt' },
        confidence: 1
      });
    });

    it('should handle multiple tool types independently', () => {
      analyzer.addPatterns([
        createPattern('read_file', true, { path: './test.txt' }),
        createPattern('search_files', true, { path: './', regex: '*.txt' }),
        createPattern('read_file', false, { path: 'bad.txt' }, ErrorCategory.RESOURCE_NOT_FOUND)
      ]);

      const readFileAnalysis = analyzer.analyzePatterns('read_file');
      const searchFilesAnalysis = analyzer.analyzePatterns('search_files');
      
      expect(readFileAnalysis.successRate).toBe(0.5);
      expect(searchFilesAnalysis.successRate).toBe(1);
    });
  });

  describe('pattern management', () => {
    it('should add single pattern', () => {
      const pattern = createPattern('read_file', true, { path: './test.txt' });
      analyzer.addPattern(pattern);

      const analysis = analyzer.analyzePatterns('read_file');
      expect(analysis.successRate).toBe(1);
    });

    it('should add multiple patterns', () => {
      const patterns = [
        createPattern('read_file', true, { path: './test1.txt' }),
        createPattern('read_file', true, { path: './test2.txt' })
      ];
      analyzer.addPatterns(patterns);

      const analysis = analyzer.analyzePatterns('read_file');
      expect(analysis.successRate).toBe(1);
    });

    it('should clear patterns', () => {
      analyzer.addPattern(createPattern('read_file', true, { path: './test.txt' }));
      analyzer.clearPatterns();

      const analysis = analyzer.analyzePatterns('read_file');
      expect(analysis.successRate).toBe(0);
    });

    it('should prune old patterns', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const oldPattern: ToolCallPattern = {
        ...createPattern('read_file', true, { path: './old.txt' }),
        timestamp: oldTimestamp
      };
      const newPattern = createPattern('read_file', false, { path: './new.txt' });

      analyzer.addPatterns([oldPattern, newPattern]);

      const analysis = analyzer.analyzePatterns('read_file');
      expect(analysis.successRate).toBe(0); // Only new pattern (failure) is counted
    });
  });

  describe('suggestion generation', () => {
    it('should suggest relative paths for better success rate', () => {
      analyzer.addPatterns([
        createPattern('read_file', true, { path: './test.txt' }),
        createPattern('read_file', false, { path: 'test.txt' }, ErrorCategory.RESOURCE_NOT_FOUND)
      ]);

      const analysis = analyzer.analyzePatterns('read_file');
      
      expect(analysis.suggestions[0]).toMatchObject({
        toolName: 'read_file',
        suggestedParameters: { path: './test.txt' },
        reasoning: expect.stringContaining('relative path')
      });
    });

    it('should suggest escaped regex patterns', () => {
      analyzer.addPatterns([
        createPattern('search_files', true, { path: './', regex: '\\*.txt' }),
        createPattern('search_files', false, { path: './', regex: '*.txt' }, ErrorCategory.INVALID_PARAMETER)
      ]);

      const analysis = analyzer.analyzePatterns('search_files');
      
      expect(analysis.suggestions[0]).toMatchObject({
        toolName: 'search_files',
        suggestedParameters: { path: './', regex: '\\*.txt' },
        reasoning: expect.stringContaining('escaped regex')
      });
    });
  });
}); 