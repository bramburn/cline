import { Observable } from 'rxjs';

export interface ApiRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  streamResponse?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId: string;
}

export interface IApiRequestService {
  request<T = any>(config: ApiRequestConfig): Observable<ApiResponse<T>>;
  streamRequest<T = any>(config: ApiRequestConfig): Observable<T>;
  cancelRequest(requestId: string): void;
} 