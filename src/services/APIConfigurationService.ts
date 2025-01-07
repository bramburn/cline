import { injectable } from 'inversify';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ModelCapabilities {
  name: string;
  contextWindow: number;
  supportsStreaming: boolean;
  supportedFeatures: string[];
}

export interface APIConfiguration {
  apiKey?: string;
  selectedModel: string;
  models: ModelCapabilities[];
  maxTokens?: number;
  temperature?: number;
}

@injectable()
export class APIConfigurationService {
  private configSubject = new BehaviorSubject<APIConfiguration>({
    selectedModel: 'gpt-3.5-turbo',
    models: [
      {
        name: 'gpt-3.5-turbo',
        contextWindow: 4096,
        supportsStreaming: true,
        supportedFeatures: ['text-completion', 'chat']
      },
      {
        name: 'gpt-4',
        contextWindow: 8192,
        supportsStreaming: true,
        supportedFeatures: ['text-completion', 'chat', 'advanced-reasoning']
      }
    ]
  });

  public getConfiguration(): Observable<APIConfiguration> {
    return this.configSubject.asObservable();
  }

  public updateConfiguration(config: Partial<APIConfiguration>): void {
    const currentConfig = this.configSubject.value;
    const updatedConfig = { ...currentConfig, ...config };
    this.configSubject.next(updatedConfig);
  }

  public setAPIKey(apiKey: string): void {
    this.updateConfiguration({ apiKey });
  }

  public getModelCapabilities(modelName: string): ModelCapabilities | undefined {
    return this.configSubject.value.models.find(model => model.name === modelName);
  }

  public validateAPIKey(apiKey: string): boolean {
    // Basic validation - can be expanded
    return apiKey.trim().length > 10;
  }
} 