export type AiAssistantMode = "LOCAL" | "OPENAI" | "SAFETY";

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
