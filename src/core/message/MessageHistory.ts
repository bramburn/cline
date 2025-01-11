import { MessageHistoryItem, MessageContext } from './MessageTypes';

export class MessageHistory {
    private history: Map<string, MessageHistoryItem>;
    private sessionContext: MessageContext;

    constructor(sessionContext: MessageContext) {
        this.history = new Map<string, MessageHistoryItem>();
        this.sessionContext = sessionContext;
    }

    public addMessage(message: MessageHistoryItem): void {
        this.history.set(message.id, {
            ...message,
            context: {
                ...this.sessionContext,
                ...message.context
            }
        });
    }

    public getMessage(id: string): MessageHistoryItem | undefined {
        return this.history.get(id);
    }

    public getRecentMessages(count: number = 10): MessageHistoryItem[] {
        return Array.from(this.history.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, count);
    }

    public getMessagesByType(type: string): MessageHistoryItem[] {
        return Array.from(this.history.values())
            .filter(message => message.type === type)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    public clearHistory(): void {
        this.history.clear();
    }

    public updateSessionContext(context: Partial<MessageContext>): void {
        this.sessionContext = {
            ...this.sessionContext,
            ...context
        };
    }

    public getSessionContext(): MessageContext {
        return { ...this.sessionContext };
    }

    public getHistorySize(): number {
        return this.history.size;
    }
} 