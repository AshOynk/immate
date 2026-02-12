import Anthropic from '@anthropic-ai/sdk';

/**
 * Analyze key frames from a compliance video with Claude.
 * Checks quality and whether the content appears to be a single live recording.
 * @param {string[]} framesBase64 - Array of base64 JPEG strings (key frames)
 * @param {string} recordedAt - ISO timestamp when recording started
 * @returns {Promise<{ passed: boolean, qualitySummary: string, appearsLive: boolean, timestampsOrIssues: string[] }>}
 */
export async function analyzeComplianceFrames(framesBase64, recordedAt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      passed: true,
      qualitySummary: 'AI check skipped (no API key).',
      appearsLive: true,
      timestampsOrIssues: [],
    };
  }
  if (!framesBase64?.length) {
    return {
      passed: false,
      qualitySummary: 'No frames provided for analysis.',
      appearsLive: false,
      timestampsOrIssues: ['Missing frame data'],
    };
  }

  const content = [
    {
      type: 'text',
      text: `You are a compliance video checker. These are ${framesBase64.length} key frames (in order) from a resident compliance video. The submission claims it was recorded live at: ${recordedAt}.

Tasks:
1. Quality: Assess clarity, lighting, and whether the content is usable for compliance review. Note any issues (e.g. too dark, blurry, no visible subject).
2. Live recording: Decide if the frames appear to be from a single continuous live recording (consistent setting, same environment, no obvious cuts or different locations). If frames look like different times/places or pre-recorded content, set appearsLive to false.
3. Timestamps/issues: List any notable timestamps (e.g. "0:15 - lighting improves") or issues.

Respond with a single JSON object only, no markdown or extra text, with these exact keys:
- "passed" (boolean): true only if quality is acceptable AND appearsLive is true
- "qualitySummary" (string): 1-2 sentence summary
- "appearsLive" (boolean): true if it looks like one continuous live recording
- "timestampsOrIssues" (array of strings): list of notable timestamps or issues`,
    },
  ];

  // Add first 5 frames (Claude vision supports multiple images per request)
  const maxFrames = Math.min(5, framesBase64.length);
  for (let i = 0; i < maxFrames; i++) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: framesBase64[i],
      },
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    });

    const text = response.content?.find((c) => c.type === 'text')?.text || '{}';
    let parsed;
    try {
      const jsonStr = text.replace(/```json?\s*|\s*```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        passed: false,
        qualitySummary: 'AI could not parse response.',
        appearsLive: false,
        timestampsOrIssues: [text.slice(0, 200)],
      };
    }
    return {
      passed: Boolean(parsed.passed),
      qualitySummary: String(parsed.qualitySummary || ''),
      appearsLive: parsed.appearsLive !== false,
      timestampsOrIssues: Array.isArray(parsed.timestampsOrIssues) ? parsed.timestampsOrIssues : [],
      rawResponse: text.slice(0, 2000),
    };
  } catch (err) {
    console.error('[Compliance AI] analyzeComplianceFrames error:', err.message || err);
    return {
      passed: false,
      qualitySummary: 'AI check failed: ' + (err.message || 'unknown error'),
      appearsLive: false,
      timestampsOrIssues: [],
    };
  }
}
