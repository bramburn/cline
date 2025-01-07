import { BehaviorSubject, Observable } from 'rxjs';
import { Anthropic } from '@anthropic-ai/sdk';

export interface AssistantMessageContent {
  type: string;
  content?: string;
  partial?: boolean;
  name?: string;
  params?: Record<string, any>;
}

export class ClineStateService {
  private isStreamingSubject = new BehaviorSubject<boolean>(false);
  private abortSubject = new BehaviorSubject<boolean>(false);
  private didCompleteReadingStreamSubject = new BehaviorSubject<boolean>(false);
  private userMessageContentReadySubject = new BehaviorSubject<boolean>(false);
  private didRejectToolSubject = new BehaviorSubject<boolean>(false);
  private didAlreadyUseToolSubject = new BehaviorSubject<boolean>(false);
  private assistantMessageContentSubject = new BehaviorSubject<AssistantMessageContent[]>([]);
  private userMessageContentSubject = new BehaviorSubject<(Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[]>([]);
  private presentAssistantMessageLockedSubject = new BehaviorSubject<boolean>(false);
  private presentAssistantMessageHasPendingUpdatesSubject = new BehaviorSubject<boolean>(false);
  private currentStreamingContentIndexSubject = new BehaviorSubject<number>(0);

  // Observables for external access
  isStreaming$: Observable<boolean> = this.isStreamingSubject.asObservable();
  abort$: Observable<boolean> = this.abortSubject.asObservable();
  didCompleteReadingStream$: Observable<boolean> = this.didCompleteReadingStreamSubject.asObservable();
  userMessageContentReady$: Observable<boolean> = this.userMessageContentReadySubject.asObservable();
  didRejectTool$: Observable<boolean> = this.didRejectToolSubject.asObservable();
  didAlreadyUseTool$: Observable<boolean> = this.didAlreadyUseToolSubject.asObservable();

  // Enhanced abort management methods
  setAbort(value: boolean): void {
    this.abortSubject.next(value);
  }

  resetAbort(): void {
    this.abortSubject.next(false);
  }

  // Getter for current abort state
  get isAborted(): boolean {
    return this.abortSubject.value;
  }

  // Setter methods
  setIsStreaming(value: boolean): void {
    this.isStreamingSubject.next(value);
  }

  setDidCompleteReadingStream(value: boolean): void {
    this.didCompleteReadingStreamSubject.next(value);
  }

  setUserMessageContentReady(value: boolean): void {
    this.userMessageContentReadySubject.next(value);
  }

  setDidRejectTool(value: boolean): void {
    this.didRejectToolSubject.next(value);
  }

  setDidAlreadyUseTool(value: boolean): void {
    this.didAlreadyUseToolSubject.next(value);
  }

  // New methods for additional state management
  setCurrentAssistantMessageContent(content: AssistantMessageContent[]): void {
    this.assistantMessageContentSubject.next(content);
  }

  setCurrentUserMessageContent(content: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[]): void {
    this.userMessageContentSubject.next(content);
  }

  setPresentAssistantMessageLocked(value: boolean): void {
    this.presentAssistantMessageLockedSubject.next(value);
  }

  setPresentAssistantMessageHasPendingUpdates(value: boolean): void {
    this.presentAssistantMessageHasPendingUpdatesSubject.next(value);
  }

  setCurrentStreamingContentIndex(index: number): void {
    this.currentStreamingContentIndexSubject.next(index);
  }

  // Getter methods for current values
  getCurrentIsStreaming(): boolean {
    return this.isStreamingSubject.value;
  }

  getCurrentAbort(): boolean {
    return this.abortSubject.value;
  }

  getCurrentDidCompleteReadingStream(): boolean {
    return this.didCompleteReadingStreamSubject.value;
  }

  getCurrentUserMessageContentReady(): boolean {
    return this.userMessageContentReadySubject.value;
  }

  getCurrentDidRejectTool(): boolean {
    return this.didRejectToolSubject.value;
  }

  getCurrentDidAlreadyUseTool(): boolean {
    return this.didAlreadyUseToolSubject.value;
  }

  // New getter methods for additional state
  getCurrentAssistantMessageContent(): AssistantMessageContent[] {
    return this.assistantMessageContentSubject.value;
  }

  getCurrentUserMessageContent(): (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] {
    return this.userMessageContentSubject.value;
  }

  getCurrentPresentAssistantMessageLocked(): boolean {
    return this.presentAssistantMessageLockedSubject.value;
  }

  getCurrentPresentAssistantMessageHasPendingUpdates(): boolean {
    return this.presentAssistantMessageHasPendingUpdatesSubject.value;
  }

  getCurrentStreamingContentIndex(): number {
    return this.currentStreamingContentIndexSubject.value;
  }

  // Reset all states
  resetAllStates(): void {
    this.setIsStreaming(false);
    this.setAbort(false);
    this.setDidCompleteReadingStream(false);
    this.setUserMessageContentReady(false);
    this.setDidRejectTool(false);
    this.setDidAlreadyUseTool(false);
    this.setCurrentAssistantMessageContent([]);
    this.setCurrentUserMessageContent([]);
    this.setPresentAssistantMessageLocked(false);
    this.setPresentAssistantMessageHasPendingUpdates(false);
    this.setCurrentStreamingContentIndex(0);
  }

  // Add missing setter methods
  setCurrentDidCompleteReadingStream(value: boolean): void {
    this.didCompleteReadingStreamSubject.next(value);
  }

  setCurrentUserMessageContentReady(value: boolean): void {
    this.userMessageContentReadySubject.next(value);
  }

  setCurrentDidRejectTool(value: boolean): void {
    this.didRejectToolSubject.next(value);
  }

  setCurrentDidAlreadyUseTool(value: boolean): void {
    this.didAlreadyUseToolSubject.next(value);
  }

  setCurrentPresentAssistantMessageLocked(value: boolean): void {
    this.presentAssistantMessageLockedSubject.next(value);
  }

  setCurrentPresentAssistantMessageHasPendingUpdates(value: boolean): void {
    this.presentAssistantMessageHasPendingUpdatesSubject.next(value);
  }
}
