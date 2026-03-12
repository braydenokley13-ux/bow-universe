export type AiModelClass = "cheap" | "reasoning";

export type AiTextGenerationParams = {
  modelClass: AiModelClass;
  systemPrompt: string;
  userPrompt: string;
};

export type AiTextGenerationResult = {
  provider: string;
  model: string;
  text: string;
  raw: unknown;
};

export interface AiProviderClient {
  provider: string;
  isConfigured(): boolean;
  generateText(params: AiTextGenerationParams): Promise<AiTextGenerationResult>;
}
