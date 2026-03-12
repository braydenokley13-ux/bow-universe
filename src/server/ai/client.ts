import { aiConfig } from "@/server/ai/config";
import { OpenAiProvider } from "@/server/ai/openai-provider";
import type {
  AiProviderClient,
  AiTextGenerationParams,
  AiTextGenerationResult
} from "@/server/ai/provider";

class UnsupportedProvider implements AiProviderClient {
  constructor(public provider: string) {}

  isConfigured() {
    return false;
  }

  async generateText(_params: AiTextGenerationParams): Promise<AiTextGenerationResult> {
    throw new Error(`${this.provider} is not configured in this workspace.`);
  }
}

export function getAiProviderClient(): AiProviderClient {
  if (aiConfig.provider === "OPENAI") {
    return new OpenAiProvider();
  }

  return new UnsupportedProvider(aiConfig.provider);
}
