import { Subject } from 'rxjs';

export interface ClineState {
  abort: boolean;
  isStreaming: boolean;
  userMessageContent: any[];
  userMessageContentReady: boolean;
  assistantMessageContent: any[];
  consecutiveAutoApprovedRequests: number;
}

export class ClineStateService {
  private state: ClineState = {
    abort: false,
    isStreaming: false,
    userMessageContent: [],
    userMessageContentReady: false,
    assistantMessageContent: [],
    consecutiveAutoApprovedRequests: 0
  };

  private stateSubject = new Subject<ClineState>();

  constructor() {}

  public updateAbort(abort: boolean): void {
    if (typeof abort !== 'boolean') {
      throw new Error('Invalid abort state');
    }
    this.state.abort = abort;
    this.emitState();
  }

  public updateIsStreaming(isStreaming: boolean): void {
    if (typeof isStreaming !== 'boolean') {
      throw new Error('Invalid streaming state');
    }
    this.state.isStreaming = isStreaming;
    this.emitState();
  }

  public setUserMessageContent(content: any[]): void {
    if (!Array.isArray(content)) {
      throw new Error('Invalid user message content');
    }
    if (!content.every(block => block.type === 'text')) {
      throw new Error('Invalid content block type');
    }
    this.state.userMessageContent = content;
    this.emitState();
  }

  public updateUserMessageContentReady(ready: boolean): void {
    if (typeof ready !== 'boolean') {
      throw new Error('Invalid ready state');
    }
    this.state.userMessageContentReady = ready;
    this.emitState();
  }

  public setAssistantMessageContent(content: any[]): void {
    if (!Array.isArray(content)) {
      throw new Error('Invalid assistant message content');
    }
    this.state.assistantMessageContent = content;
    this.emitState();
  }

  public incrementConsecutiveAutoApprovedRequests(): void {
    this.state.consecutiveAutoApprovedRequests++;
    this.emitState();
  }

  public resetConsecutiveAutoApprovedRequests(): void {
    this.state.consecutiveAutoApprovedRequests = 0;
    this.emitState();
  }

  public getCurrentState(): ClineState {
    return { ...this.state };
  }

  public getStateUpdates() {
    return this.stateSubject.asObservable();
  }

  private emitState(): void {
    this.stateSubject.next({ ...this.state });
  }
}
