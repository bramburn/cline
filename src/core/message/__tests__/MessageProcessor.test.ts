import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageProcessor } from '../MessageProcessor';
import { MessageContext, MessageData } from '../MessageTypes';

describe('MessageProcessor', () => {
    let messageProcessor: MessageProcessor;
    let context: MessageContext;

    beforeEach(() => {
        context = {
            sessionId: 'test-session',
            userId: 'test-user',
            environment: 'test'
        };
        messageProcessor = new MessageProcessor(context);
    });

    describe('Message Processing', () => {
        it('should process a text message successfully', async () => {
            const message: Partial<MessageData> = {
                text: 'Hello, world!',
                timestamp: Date.now()
            };

            const result = await messageProcessor.processMessage(message);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Text message processed successfully');
        });

        it('should process an image message successfully', async () => {
            const message: Partial<MessageData> = {
                images: ['image1.jpg'],
                timestamp: Date.now()
            };

            const result = await messageProcessor.processMessage(message);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Image message processed successfully');
        });

        it('should process a mixed message successfully', async () => {
            const message: Partial<MessageData> = {
                text: 'Image description',
                images: ['image1.jpg'],
                timestamp: Date.now()
            };

            const result = await messageProcessor.processMessage(message);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Mixed message processed successfully');
        });

        it('should throw error for invalid message', async () => {
            const message: Partial<MessageData> = {
                timestamp: Date.now()
            };

            await expect(messageProcessor.processMessage(message)).rejects.toThrow(
                'Message must contain either text or images'
            );
        });
    });

    describe('Observable Streams', () => {
        it('should emit processed message to subscribers', async () => {
            const messageCallback = vi.fn();
            messageProcessor.messages$.subscribe(messageCallback);

            const message: Partial<MessageData> = {
                text: 'Test message',
                timestamp: Date.now()
            };

            await messageProcessor.processMessage(message);
            expect(messageCallback).toHaveBeenCalled();
        });

        it('should emit processing state changes', async () => {
            const stateCallback = vi.fn();
            messageProcessor.processingState$.subscribe(stateCallback);

            const message: Partial<MessageData> = {
                text: 'Test message',
                timestamp: Date.now()
            };

            await messageProcessor.processMessage(message);
            expect(stateCallback).toHaveBeenCalledWith(true);
            expect(stateCallback).toHaveBeenCalledWith(false);
        });

        it('should emit errors when they occur', async () => {
            const errorCallback = vi.fn();
            messageProcessor.errors$.subscribe(errorCallback);

            const message: Partial<MessageData> = {
                timestamp: Date.now()
            };

            try {
                await messageProcessor.processMessage(message);
            } catch (error) {
                expect(errorCallback).toHaveBeenCalled();
            }
        });
    });

    describe('Message History', () => {
        it('should store processed messages in history', async () => {
            const message: Partial<MessageData> = {
                text: 'Test message',
                timestamp: Date.now()
            };

            await messageProcessor.processMessage(message);
            const recentMessages = messageProcessor.getRecentMessages(1);
            expect(recentMessages.length).toBe(1);
            expect(recentMessages[0].text).toBe('Test message');
        });

        it('should update context correctly', () => {
            const newContext: Partial<MessageContext> = {
                userId: 'new-user'
            };

            messageProcessor.updateContext(newContext);
            const recentMessages = messageProcessor.getRecentMessages();
            expect(recentMessages.length).toBe(0);
        });
    });
}); 