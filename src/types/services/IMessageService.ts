import { Observable } from 'rxjs';
import { Message, MessageState, MessageProcessingResult } from '../MessageTypes';

export interface IMessageService {
  sendMessage(message: Message): Observable<MessageProcessingResult>;
  getState(): Observable<MessageState>;
  getMessages(): Observable<Message[]>;
  getCurrentTask(): any; // TODO: Add proper task type
  updateMessageContent(messageId: string, content: string): void;
  dispose(): void;
} 