import { StreamController } from './StreamController';

export interface ApiRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export class ApiRequestService {
  private streamController: StreamController;

  constructor(streamController: StreamController) {
    this.streamController = streamController;
  }

  public async performRequest<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      this.streamController.updateProgress(0);

      const controller = new AbortController();
      const timeoutId = config.timeout ? setTimeout(() => controller.abort(), config.timeout) : null;

      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      this.streamController.updateProgress(50);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const headers = Object.fromEntries(response.headers.entries());

      this.streamController.updateProgress(100);
      this.streamController.stop();

      return {
        data,
        status: response.status,
        headers
      };
    } catch (error) {
      this.streamController.error(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
} 