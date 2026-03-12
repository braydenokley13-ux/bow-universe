import { aiConfig, hasOpenAiConfigured } from "@/server/ai/config";
import type {
  AiProviderClient,
  AiTextGenerationParams,
  AiTextGenerationResult
} from "@/server/ai/provider";

function pickModel(modelClass: AiTextGenerationParams["modelClass"]) {
  return modelClass === "cheap" ? aiConfig.cheapModel : aiConfig.reasoningModel;
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string" && record.output_text.trim().length > 0) {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];
  const parts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as Array<unknown>)
      : [];

    for (const entry of content) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const text = (entry as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim().length > 0) {
        parts.push(text);
      }
    }
  }

  return parts.join("\n").trim();
}

export class OpenAiProvider implements AiProviderClient {
  provider = "OPENAI";

  isConfigured() {
    return hasOpenAiConfigured();
  }

  async generateText(params: AiTextGenerationParams): Promise<AiTextGenerationResult> {
    const model = pickModel(params.modelClass);
    const response = await fetch(`${aiConfig.openAiBaseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiConfig.openAiApiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: params.systemPrompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: params.userPrompt }]
          }
        ]
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? JSON.stringify((payload as Record<string, unknown>).error)
          : "OpenAI request failed.";
      throw new Error(message);
    }

    return {
      provider: this.provider,
      model,
      text: extractOutputText(payload),
      raw: payload
    };
  }
}
