export const aiConfig = {
  provider: (process.env.AI_PROVIDER ?? "OPENAI").toUpperCase(),
  openAiBaseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com").replace(/\/$/, ""),
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  cheapModel: process.env.OPENAI_MODEL_CHEAP ?? "gpt-5-nano",
  reasoningModel: process.env.OPENAI_MODEL_REASONING ?? "gpt-5-mini"
} as const;

export function hasOpenAiConfigured() {
  return aiConfig.openAiApiKey.trim().length > 0;
}
