import { BehaviorSubject, Observable } from 'rxjs';
import { Anthropic } from '@anthropic-ai/sdk';
import { AssistantMessageContent } from '../core/assistant-message';

// Type guard for UserContentBlock
function isValidUserContentBlock(block: any): block is UserContentBlock {
  return block && 
    'type' in block && 
    ['text', 'image', 'tool_use', 'tool_result'].includes(block.type);
}

// Type definition for UserContentBlock and UserContent
type UserContentBlock = 
  | Anthropic.TextBlockParam 
  | Anthropic.ImageBlockParam 
  | Anthropic.ToolUseBlockParam 
  | Anthropic.ToolResultBlockParam;

type UserContent = UserContentBlock[];

export class ClineStateService {
  // Existing state subjects
  private isStreamingSubject = new BehaviorSubject<boolean>(false);
  private abortSubject = new BehaviorSubject<boolean>(false);
  private didCompleteReadingStreamSubject = new BehaviorSubject<boolean>(false);
  private userMessageContentReadySubject = new BehaviorSubject<boolean>(false);
  private didRejectToolSubject = new BehaviorSubject<boolean>(false);
  private didAlreadyUseToolSubject = new BehaviorSubject<boolean>(false);
  private assistantMessageContentSubject = new BehaviorSubject<AssistantMessageContent[]>([]);
  private userMessageContentSubject = new BehaviorSubject<UserContent>([]);
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

  // Setter methods with enhanced type safety
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

  // Enhanced method for setting user message content
  setCurrentUserMessageContent(content: UserContent): void {
    // Validate the content before setting
    if (this.isValidUserContent(content)) {
      this.userMessageContentSubject.next(content);
    } else {
      console.warn('Invalid user content provided', content);
    }
  }

  // Type guard method for UserContent
  isValidUserContent(content: any): content is UserContent {
    return Array.isArray(content) && 
      content.every(block => isValidUserContentBlock(block));
  }

  // Getter methods
  get userMessageContentReady(): boolean {
    return this.userMessageContentReadySubject.value;
  }

  get userMessageContent(): UserContent {
    return this.userMessageContentSubject.value;
  }

  // New methods for additional state management
  setCurrentAssistantMessageContent(content: AssistantMessageContent[]): void {
    this.assistantMessageContentSubject.next(content);
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
