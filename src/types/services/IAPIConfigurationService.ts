import { Observable } from 'rxjs';
import { ModelCapabilities, APIConfiguration } from '../../services/APIConfigurationService';

export interface IAPIConfigurationService {
  getConfiguration(): Observable<APIConfiguration>;
  updateConfiguration(config: Partial<APIConfiguration>): void;
  setAPIKey(apiKey: string): void;
  getModelCapabilities(modelName: string): ModelCapabilities | undefined;
  validateAPIKey(apiKey: string): boolean;
} 