'use server';

const RIVAL_FUNCTION_URL =
  'https://cortexconnect.rival.io/api/v1/functions/06c0b97b-c666-4d90-9e59-2c2f86fa4e12/v1.0.0/invoke';

export type AiDetectorResult = {
  probability: number;
  verdict: string;
  words: number;
  sentences: number;
  paragraphs: number;
  signals: Record<string, number>;
};

export async function detectAiContent(
  text: string,
): Promise<{ data: AiDetectorResult | null; error: string | null }> {
  const apiKey = process.env.RIVAL_API_KEY;
  if (!apiKey) {
    return { data: null, error: 'AI detector is not configured' };
  }

  if (!text || text.trim().length < 50) {
    return { data: null, error: 'Text must be at least 50 characters' };
  }

  try {
    const res = await fetch(RIVAL_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({ event: { text } }),
    });

    if (!res.ok) {
      return { data: null, error: 'AI detection service unavailable' };
    }

    const json = await res.json();

    if (!json.success) {
      return { data: null, error: json.result?.details ?? 'Analysis failed' };
    }

    const body =
      typeof json.result?.body === 'string'
        ? JSON.parse(json.result.body)
        : json.result?.body;

    return { data: body as AiDetectorResult, error: null };
  } catch {
    return { data: null, error: 'Failed to reach AI detection service' };
  }
}
