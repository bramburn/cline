export interface MessageData {
    id: string;
    text?: string;
    images?: string[];
    timestamp: number;
    type: MessageType;
    metadata?: Record<string, any>;
}

export type MessageType = 
    | 'text'
    | 'image' 
    | 'mixed'
    | 'tool_request'
    | 'code_related'
    | 'clarification'
    | 'instruction'
    | 'system'
    | 'general';

export interface ProcessingResult {
    success: boolean;
    message: string;
    data?: any;
    error?: Error;
}

export interface MessageContext {
    sessionId: string;
    userId?: string;
    environment?: string;
    metadata?: Record<string, any>;
}

export interface MessageHistoryItem extends MessageData {
    context: MessageContext;
    processingResult?: ProcessingResult;
}

export interface Entity {
    type: string;
    value: string;
    confidence: number;
}

export interface ContextData {
    previousMessageId?: string;
    relatedMessages?: string[];
    entities?: Entity[];
}

export interface MessageTriageResult {
    intent: string;
    priority: 'high' | 'medium' | 'low';
    requiredTools: string[];
    contextKeys: string[];
    suggestedActions: string[];
} 