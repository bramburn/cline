import { Subject, BehaviorSubject, Observable, catchError, filter, map, mergeMap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { WebviewMessage } from '../../shared/WebviewMessage';
import { ExtensionMessage, ExtensionState } from '../../shared/ExtensionMessage';

export interface Message {
    id: string;
    type: string;
    content: any;
    timestamp: number;
    status: MessageStatus;
    metadata?: Record<string, any>;
}

export type MessageStatus = 'pending' | 'processing' | 'completed' | 'error';

export class MessageStream {
    private readonly messageSubject = new Subject<Message>();
    private readonly stateSubject = new BehaviorSubject<ExtensionState | null>(null);
    private readonly errorSubject = new Subject<Error>();

    constructor() {
        this.initializeMessageProcessing();
    }

    private initializeMessageProcessing() {
        this.messageSubject.pipe(
            filter(msg => this.shouldProcessMessage(msg)),
            mergeMap(msg => this.processMessage(msg)),
            catchError(error => {
                this.errorSubject.next(error);
                return [];
            })
        ).subscribe();
    }

    private shouldProcessMessage(message: Message): boolean {
        return message.status === 'pending';
    }

    private async processMessage(message: Message): Promise<Message> {
        try {
            const processedMessage = {
                ...message,
                status: 'processing' as MessageStatus
            };

            // Emit the processing status
            this.messageSubject.next(processedMessage);

            // Process the message based on type
            const result = await this.executeMessageProcessing(processedMessage);

            return {
                ...result,
                status: 'completed' as MessageStatus
            };
        } catch (error) {
            const errorMessage = {
                ...message,
                status: 'error' as MessageStatus,
                metadata: {
                    ...message.metadata,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
            this.errorSubject.next(error as Error);
            return errorMessage;
        }
    }

    private async executeMessageProcessing(message: Message): Promise<Message> {
        // Implement specific message processing logic here
        // This will be expanded based on message types
        return message;
    }

    public sendMessage(content: WebviewMessage): void {
        const message: Message = {
            id: uuidv4(),
            type: content.type,
            content,
            timestamp: Date.now(),
            status: 'pending'
        };
        this.messageSubject.next(message);
    }

    public updateState(state: Partial<ExtensionState>): void {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
            ...currentState,
            ...state
        } as ExtensionState);
    }

    public getState(): Observable<ExtensionState | null> {
        return this.stateSubject.asObservable();
    }

    public getMessages(): Observable<Message> {
        return this.messageSubject.asObservable();
    }

    public getErrors(): Observable<Error> {
        return this.errorSubject.asObservable();
    }

    public sendExtensionMessage(message: ExtensionMessage): void {
        this.messageSubject.next({
            id: uuidv4(),
            type: message.type,
            content: message,
            timestamp: Date.now(),
            status: 'pending'
        });
    }
} 