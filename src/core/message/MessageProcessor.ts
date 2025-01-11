import { v4 as uuidv4 } from 'uuid';
import { MessageData, MessageType, ProcessingResult, MessageContext, MessageTriageResult } from './MessageTypes';
import { MessageHistory } from './MessageHistory';
import { Observable, Subject } from 'rxjs';

export class MessageProcessor {
    private messageHistory: MessageHistory;
    private messageSubject: Subject<MessageData>;
    private processingStateSubject: Subject<boolean>;
    private errorSubject: Subject<Error>;

    constructor(context: MessageContext) {
        this.messageHistory = new MessageHistory(context);
        this.messageSubject = new Subject<MessageData>();
        this.processingStateSubject = new Subject<boolean>();
        this.errorSubject = new Subject<Error>();
    }

    public get messages$(): Observable<MessageData> {
        return this.messageSubject.asObservable();
    }

    public get processingState$(): Observable<boolean> {
        return this.processingStateSubject.asObservable();
    }

    public get errors$(): Observable<Error> {
        return this.errorSubject.asObservable();
    }

    public async processMessage(message: Partial<MessageData>): Promise<ProcessingResult> {
        try {
            this.processingStateSubject.next(true);

            // Validate and enrich the message
            const validatedMessage = this.validateMessage(message);
            const enrichedMessage = await this.enrichMessage(validatedMessage);

            // Process based on message type
            const result = await this.executeProcessing(enrichedMessage);

            // Add to history and emit
            this.messageHistory.addMessage({
                ...enrichedMessage,
                context: this.messageHistory.getSessionContext()
            });
            this.messageSubject.next(enrichedMessage);

            this.processingStateSubject.next(false);
            return result;
        } catch (error) {
            this.handleError(error);
            this.processingStateSubject.next(false);
            throw error;
        }
    }

    private validateMessage(message: Partial<MessageData>): MessageData {
        if (!message.text && !message.images) {
            throw new Error('Message must contain either text or images');
        }

        return {
            id: message.id || uuidv4(),
            text: message.text,
            images: message.images,
            timestamp: message.timestamp || Date.now(),
            type: this.determineMessageType(message),
            metadata: message.metadata || {}
        };
    }

    private determineMessageType(message: Partial<MessageData>): MessageType {
        if (message.text && message.images) return 'mixed';
        if (message.images) return 'image';
        return 'text';
    }

    private async enrichMessage(message: MessageData): Promise<MessageData> {
        const triageResult = await this.triageMessage(message);
        return {
            ...message,
            metadata: {
                ...message.metadata,
                triage: triageResult
            }
        };
    }

    private async triageMessage(message: MessageData): Promise<MessageTriageResult> {
        // Implement message triage logic here
        // This could involve NLP, pattern matching, or other analysis
        return {
            intent: 'general',
            priority: 'medium',
            requiredTools: [],
            contextKeys: [],
            suggestedActions: []
        };
    }

    private async executeProcessing(message: MessageData): Promise<ProcessingResult> {
        switch (message.type) {
            case 'text':
                return this.processTextMessage(message);
            case 'image':
                return this.processImageMessage(message);
            case 'mixed':
                return this.processMixedMessage(message);
            default:
                return {
                    success: false,
                    message: `Unsupported message type: ${message.type}`,
                    error: new Error(`Unsupported message type: ${message.type}`)
                };
        }
    }

    private async processTextMessage(message: MessageData): Promise<ProcessingResult> {
        // Implement text message processing logic
        return {
            success: true,
            message: 'Text message processed successfully',
            data: message
        };
    }

    private async processImageMessage(message: MessageData): Promise<ProcessingResult> {
        // Implement image message processing logic
        return {
            success: true,
            message: 'Image message processed successfully',
            data: message
        };
    }

    private async processMixedMessage(message: MessageData): Promise<ProcessingResult> {
        // Implement mixed message processing logic
        return {
            success: true,
            message: 'Mixed message processed successfully',
            data: message
        };
    }

    private handleError(error: any): void {
        const processedError = error instanceof Error ? error : new Error(String(error));
        this.errorSubject.next(processedError);
    }

    public getRecentMessages(count: number = 10): MessageData[] {
        return this.messageHistory.getRecentMessages(count);
    }

    public updateContext(context: Partial<MessageContext>): void {
        this.messageHistory.updateSessionContext(context);
    }
} 