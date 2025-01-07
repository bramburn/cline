import { Subject } from 'rxjs';
import { ClineMessage } from '../../shared/ExtensionMessage';

export class ReactiveConversationHistoryService {
  private messagesSubject = new Subject<ClineMessage[]>();
  private messages: ClineMessage[] = [];
  private isProcessing = false;
  private error: string | null = null;

  constructor(options: { taskDir: string }) {
    if (!options.taskDir) {
      throw new Error('Task directory is required');
    }
  }

  addMessage(message: ClineMessage): Promise<void> {
    this.messages.push(message);
    this.messagesSubject.next([...this.messages]);
    return Promise.resolve();
  }

  updateMessage(message: ClineMessage): void {
    const index = this.messages.findIndex(m => m.ts === message.ts);
    if (index !== -1) {
      this.messages[index] = message;
    } else {
      this.messages.push(message);
    }
    this.messagesSubject.next([...this.messages]);
  }

  getMessages() {
    return this.messagesSubject.asObservable();
  }

  getCurrentState() {
    return {
      messages: this.messages,
      isProcessing: this.isProcessing,
      error: this.error
    };
  }

  setProcessing(isProcessing: boolean): void {
    this.isProcessing = isProcessing;
  }

  setError(error: string): void {
    this.error = error;
  }

  dispose(): void {
    this.messagesSubject.complete();
  }
} 