export type AiAssistantMode = 'LOCAL' | 'OLLAMA' | 'OPENAI' | 'SAFETY';
export type AiChatRole = 'user' | 'assistant';

export interface AiConversationMessage {
  readonly role: AiChatRole;
  readonly content: string;
}

export interface AiAssistantSource {
  readonly title: string;
  readonly link: string;
  readonly type: string;
}

export interface AiAssistantReply {
  readonly answer: string;
  readonly mode: AiAssistantMode;
  readonly disclaimer: string;
  readonly sources: readonly AiAssistantSource[];
  readonly suggestedQuestions: readonly string[];
}

export interface AiChatMessage extends AiConversationMessage {
  readonly id: number | string;
  readonly sources?: readonly AiAssistantSource[];
  readonly mode?: AiAssistantMode;
  readonly createdAt?: string;
}

export interface AiConversationSummary {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messageCount: number;
}

export interface AiConversationDetail extends AiConversationSummary {
  readonly messages: readonly AiChatMessage[];
}

export interface AiConversationSendResult {
  readonly conversation: AiConversationSummary;
  readonly userMessage: AiChatMessage;
  readonly assistantMessage: AiChatMessage;
  readonly disclaimer: string;
  readonly suggestedQuestions: readonly string[];
}
