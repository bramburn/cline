import { Observable } from 'rxjs';

export interface StreamProgress {
  status: 'active' | 'paused' | 'stopped';
  progress: number;
  error?: Error;
}

export interface IStreamController {
  getProgressUpdates(): Observable<StreamProgress>;
  pause(): void;
  resume(): void;
  stop(): void;
  error(err: Error): void;
} 