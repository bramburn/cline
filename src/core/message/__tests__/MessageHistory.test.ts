import { describe, it, expect, beforeEach } from 'vitest';
import { MessageHistory } from '../MessageHistory';
import { MessageContext, MessageHistoryItem } from '../MessageTypes';

describe('MessageHistory', () => {
    let messageHistory: MessageHistory;
    let context: MessageContext;

    beforeEach(() => {
        context = {
            sessionId: 'test-session',
            userId: 'test-user',
            environment: 'test'
        };
        messageHistory = new MessageHistory(context);
    });

    describe('Message Management', () => {
        it('should add and retrieve a message', () => {
            const message: MessageHistoryItem = {
                id: '1',
                text: 'Test message',
                type: 'text',
                timestamp: Date.now(),
                context: context
            };

            messageHistory.addMessage(message);
            const retrieved = messageHistory.getMessage('1');
            expect(retrieved).toBeDefined();
            expect(retrieved?.text).toBe('Test message');
        });

        it('should get recent messages in correct order', () => {
            const messages: MessageHistoryItem[] = [
                {
                    id: '1',
                    text: 'First message',
                    type: 'text',
                    timestamp: Date.now() - 2000,
                    context: context
                },
                {
                    id: '2',
                    text: 'Second message',
                    type: 'text',
                    timestamp: Date.now() - 1000,
                    context: context
                },
                {
                    id: '3',
                    text: 'Third message',
                    type: 'text',
                    timestamp: Date.now(),
                    context: context
                }
            ];

            messages.forEach(msg => messageHistory.addMessage(msg));
            const recent = messageHistory.getRecentMessages(2);
            
            expect(recent.length).toBe(2);
            expect(recent[0].id).toBe('3');
            expect(recent[1].id).toBe('2');
        });

        it('should get messages by type', () => {
            const messages: MessageHistoryItem[] = [
                {
                    id: '1',
                    text: 'Text message',
                    type: 'text',
                    timestamp: Date.now(),
                    context: context
                },
                {
                    id: '2',
                    images: ['image.jpg'],
                    type: 'image',
                    timestamp: Date.now(),
                    context: context
                }
            ];

            messages.forEach(msg => messageHistory.addMessage(msg));
            const textMessages = messageHistory.getMessagesByType('text');
            const imageMessages = messageHistory.getMessagesByType('image');

            expect(textMessages.length).toBe(1);
            expect(imageMessages.length).toBe(1);
            expect(textMessages[0].type).toBe('text');
            expect(imageMessages[0].type).toBe('image');
        });

        it('should clear history', () => {
            const message: MessageHistoryItem = {
                id: '1',
                text: 'Test message',
                type: 'text',
                timestamp: Date.now(),
                context: context
            };

            messageHistory.addMessage(message);
            expect(messageHistory.getHistorySize()).toBe(1);

            messageHistory.clearHistory();
            expect(messageHistory.getHistorySize()).toBe(0);
        });
    });

    describe('Context Management', () => {
        it('should update session context', () => {
            const newContext: Partial<MessageContext> = {
                userId: 'new-user'
            };

            messageHistory.updateSessionContext(newContext);
            const currentContext = messageHistory.getSessionContext();
            
            expect(currentContext.userId).toBe('new-user');
            expect(currentContext.sessionId).toBe('test-session');
        });

        it('should merge context when adding messages', () => {
            const messageContext: MessageContext = {
                sessionId: 'message-session',
                userId: 'message-user'
            };

            const message: MessageHistoryItem = {
                id: '1',
                text: 'Test message',
                type: 'text',
                timestamp: Date.now(),
                context: messageContext
            };

            messageHistory.addMessage(message);
            const retrieved = messageHistory.getMessage('1');
            
            expect(retrieved?.context.sessionId).toBe('message-session');
            expect(retrieved?.context.environment).toBe('test');
        });
    });
}); 