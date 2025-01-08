import { container } from '../index';
import { TYPES } from '../../types';
import { IAPIConfigurationService } from '../../types/services/IAPIConfigurationService';
import { IMessageService } from '../../types/services/IMessageService';
import { ICustomInstructionsService } from '../../types/services/ICustomInstructionsService';
import { firstValueFrom } from 'rxjs';

describe('Dependency Injection Container', () => {
  beforeEach(() => {
    container.snapshot();
  });

  afterEach(() => {
    container.restore();
  });

  describe('Core Services', () => {
    it('should resolve APIConfigurationService', () => {
      const service = container.get<IAPIConfigurationService>(TYPES.APIConfigurationService);
      expect(service).toBeDefined();
      expect(service.getConfiguration).toBeDefined();
    });

    it('should resolve MessageService', () => {
      const service = container.get<IMessageService>(TYPES.MessageService);
      expect(service).toBeDefined();
      expect(service.sendMessage).toBeDefined();
    });

    it('should resolve CustomInstructionsService', () => {
      const service = container.get<ICustomInstructionsService>(TYPES.CustomInstructionsService);
      expect(service).toBeDefined();
      expect(service.getInstructions).toBeDefined();
    });
  });

  describe('Service State Management', () => {
    it('should maintain singleton state for APIConfigurationService', async () => {
      const service1 = container.get<IAPIConfigurationService>(TYPES.APIConfigurationService);
      const service2 = container.get<IAPIConfigurationService>(TYPES.APIConfigurationService);
      
      service1.setAPIKey('test-key');
      const config = await firstValueFrom(service2.getConfiguration());
      
      expect(config.apiKey).toBe('test-key');
      expect(service1).toBe(service2);
    });

    it('should maintain singleton state for CustomInstructionsService', async () => {
      const service1 = container.get<ICustomInstructionsService>(TYPES.CustomInstructionsService);
      const service2 = container.get<ICustomInstructionsService>(TYPES.CustomInstructionsService);
      
      service1.addInstruction({
        title: 'Test',
        content: 'Test content',
        isActive: true
      });

      const state = await firstValueFrom(service2.getInstructions());
      expect(state.instructions).toHaveLength(1);
      expect(state.instructions[0].title).toBe('Test');
      expect(service1).toBe(service2);
    });
  });

  describe('Service Dependencies', () => {
    it('should resolve MessageService with all dependencies', () => {
      const service = container.get<IMessageService>(TYPES.MessageService);
      expect(service).toBeDefined();
      
      // Test sending a message to verify dependencies are working
      const message = {
        id: 'test',
        type: 'user',
        content: 'Test message',
        timestamp: Date.now()
      };

      expect(() => service.sendMessage(message)).not.toThrow();
    });
  });
}); 