/**
 * Gemini 2.5 Pro client for pSEO research stage.
 * Reads GEMINI_API_KEY from env.
 */

const API_KEY = process.env.GEMINI_API_KEY?.trim();

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  withGoogleSearch?: boolean;
  jsonResponse?: boolean;
}

export interface GenerateResult {
  text: string;
  promptTokens: number;
  outputTokens: number;
}

export async function gemini(prompt: string, opts: GenerateOptions = {}): Promise<GenerateResult> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY not set');
  const model = opts.model ?? 'gemini-2.5-pro';

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      ...(opts.jsonResponse ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts.withGoogleSearch) {
    body.tools = [{ googleSearch: {} }];
  }

  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
    };
  };
  return {
    text: data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '',
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens:
      (data.usageMetadata?.candidatesTokenCount ?? 0) +
      (data.usageMetadata?.thoughtsTokenCount ?? 0),
  };
}

/** Strip leading ```json fences a model sometimes wraps JSON in. */
export function stripJsonFences(s: string): string {
  return s
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}
