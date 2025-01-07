import { ClineMessage } from '../shared/ExtensionMessage';

export interface ConversationState {
  messages: ClineMessage[];
  lastMessageTs?: number;
  askResponse?: any;
  askResponseText?: string;
  askResponseImages?: string[];
  isProcessing: boolean;
  error?: string;
}

export interface ConversationStateUpdate {
  type: 'message' | 'response' | 'processing' | 'error';
  payload: Partial<ConversationState>;
} 