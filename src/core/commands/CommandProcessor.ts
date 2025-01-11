import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as vscode from 'vscode';
import { WebviewMessage } from '../../shared/WebviewMessage';
import { Message } from '../messaging/MessageStream';
import { StateManager } from '../state/StateManager';

export interface Command {
    type: string;
    payload: any;
}

export interface CommandHandler {
    handle(command: Command): Observable<Message>;
}

export class CommandProcessor {
    private handlers: Map<string, CommandHandler> = new Map();
    private readonly stateManager: StateManager;

    constructor(stateManager: StateManager) {
        this.stateManager = stateManager;
        this.registerDefaultHandlers();
    }

    private registerDefaultHandlers() {
        // Register built-in command handlers
        this.registerHandler('clearTask', {
            handle: (command: Command) => {
                return from(this.handleClearTask()).pipe(
                    map(result => this.createMessage('clearTask', result))
                );
            }
        });

        this.registerHandler('newTask', {
            handle: (command: Command) => {
                return from(this.handleNewTask(command.payload)).pipe(
                    map(result => this.createMessage('newTask', result))
                );
            }
        });

        this.registerHandler('cancelTask', {
            handle: (command: Command) => {
                return from(this.handleCancelTask()).pipe(
                    map(result => this.createMessage('cancelTask', result))
                );
            }
        });

        // Add more default handlers as needed
    }

    public registerHandler(type: string, handler: CommandHandler): void {
        this.handlers.set(type, handler);
    }

    public execute(command: Command): Observable<Message> {
        const handler = this.handlers.get(command.type);
        if (!handler) {
            return of(this.createErrorMessage(`No handler registered for command type: ${command.type}`));
        }

        return handler.handle(command).pipe(
            catchError(error => of(this.createErrorMessage(error.message)))
        );
    }

    public processWebviewMessage(message: WebviewMessage): Observable<Message> {
        return this.execute({
            type: message.type,
            payload: message
        });
    }

    private createMessage(type: string, content: any): Message {
        return {
            id: crypto.randomUUID(),
            type,
            content,
            timestamp: Date.now(),
            status: 'completed'
        };
    }

    private createErrorMessage(error: string): Message {
        return {
            id: crypto.randomUUID(),
            type: 'error',
            content: error,
            timestamp: Date.now(),
            status: 'error',
            metadata: { error }
        };
    }

    // Command Handlers
    private async handleClearTask(): Promise<void> {
        await this.stateManager.updateState({
            clineMessages: [],
            currentTaskItem: undefined
        });
        return;
    }

    private async handleNewTask(payload: WebviewMessage): Promise<void> {
        const currentState = this.stateManager.getCurrentState();
        // Implement new task logic
        await this.stateManager.updateState({
            currentTaskItem: {
                id: crypto.randomUUID(),
                ts: Date.now(),
                task: payload.text || '',
                tokensIn: 0,
                tokensOut: 0,
                totalCost: 0
            }
        });
        return;
    }

    private async handleCancelTask(): Promise<void> {
        const currentState = this.stateManager.getCurrentState();
        if (currentState.currentTaskItem) {
            await this.stateManager.updateState({
                currentTaskItem: undefined
            });
        }
        return;
    }
} 