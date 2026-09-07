export type GeminiGenerateJsonInput = {
  prompt: string;
  mimeType: string;
  base64Data: string;
};

export type GeminiGenerateJson = (
  input: GeminiGenerateJsonInput,
) => Promise<string>;
