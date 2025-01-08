import { APIConfigurationService } from '../APIConfigurationService';
import { firstValueFrom } from 'rxjs';

describe('APIConfigurationService', () => {
  let service: APIConfigurationService;

  beforeEach(() => {
    service = new APIConfigurationService();
  });

  describe('Initial Configuration', () => {
    it('should have default configuration', async () => {
      const config = await firstValueFrom(service.getConfiguration());
      
      expect(config.selectedModel).toBe('gpt-3.5-turbo');
      expect(config.models.length).toBeGreaterThan(0);
    });

    it('should have default models with correct properties', async () => {
      const config = await firstValueFrom(service.getConfiguration());
      const gpt35Model = config.models.find(m => m.name === 'gpt-3.5-turbo');
      const gpt4Model = config.models.find(m => m.name === 'gpt-4');

      expect(gpt35Model).toBeDefined();
      expect(gpt4Model).toBeDefined();
      
      expect(gpt35Model?.contextWindow).toBe(4096);
      expect(gpt4Model?.contextWindow).toBe(8192);
      expect(gpt35Model?.supportsStreaming).toBe(true);
      expect(gpt4Model?.supportsStreaming).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', async () => {
      service.updateConfiguration({ 
        apiKey: 'test-key', 
        maxTokens: 1000 
      });

      const config = await firstValueFrom(service.getConfiguration());
      
      expect(config.apiKey).toBe('test-key');
      expect(config.maxTokens).toBe(1000);
    });

    it('should set API key', async () => {
      service.setAPIKey('new-api-key');

      const config = await firstValueFrom(service.getConfiguration());
      
      expect(config.apiKey).toBe('new-api-key');
    });
  });

  describe('Model Capabilities', () => {
    it('should retrieve model capabilities', () => {
      const capabilities = service.getModelCapabilities('gpt-3.5-turbo');
      
      expect(capabilities).toBeDefined();
      expect(capabilities?.contextWindow).toBe(4096);
      expect(capabilities?.supportsStreaming).toBe(true);
      expect(capabilities?.supportedFeatures).toContain('text-completion');
      expect(capabilities?.supportedFeatures).toContain('chat');
    });

    it('should return undefined for unknown model', () => {
      const capabilities = service.getModelCapabilities('unknown-model');
      
      expect(capabilities).toBeUndefined();
    });
  });

  describe('API Key Validation', () => {
    it('should validate API key length', () => {
      expect(service.validateAPIKey('short')).toBe(false);
      expect(service.validateAPIKey('valid-api-key-123456')).toBe(true);
    });
  });
}); 