import { ClineMessage } from '../../shared/ExtensionMessage';

export class MessageProcessingPipeline {
  async processMessage(message: ClineMessage): Promise<ClineMessage> {
    // Return the message as is for testing
    return message;
  }
} 