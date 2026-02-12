import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

const MOOD_GUIDANCE = {
  sad: 'The resident selected they are feeling sad. Be warm, gentle and supportive. Invite them to share what\'s on their mind if they want to, but don\'t push. Acknowledge that it\'s okay to not be okay. Keep it brief and caring.',
  low: 'The resident selected they are feeling low. Offer gentle support. Ask if they\'d like to talk about their day or what might help. Don\'t push; leave space for them to open up naturally.',
  neutral: 'The resident selected they feel okay/neutral. Gently invite them to share how their day has been. You can ask what they\'ve been up to or if anything stands out—good or not so good.',
  good: 'The resident selected they are doing good. Lean in positively: ask what\'s been going well or what made today good. Help them notice and name positive moments.',
  happy: 'The resident selected they are happy. Celebrate with them. Ask what went well, what made them happy, and help them recognise the signals—what they did or what happened that led to this. Encourage them to notice patterns so they can build on what works.',
};

/**
 * Get the first AI message after mood selection (no user message yet).
 */
export async function getFirstWelfareMessage(mood, name) {
  const client = getClient();
  if (!client) {
    return "Thanks for checking in. I'm here if you'd like to share how your day has been—type or speak whenever you're ready.";
  }
  try {
    const guidance = MOOD_GUIDANCE[mood] || MOOD_GUIDANCE.neutral;
    const namePart = name ? ` Their name is ${name}.` : '';
    const system = `You are a warm, supportive welfare check-in assistant. The resident has just chosen how they're feeling. ${guidance}${namePart}
Respond with a single short message (2-4 sentences) that fits that guidance. Be conversational and human. Do not use markdown or labels. Do not diagnose or give medical advice.`;
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      system,
      messages: [{ role: 'user', content: 'Generate your first message to the resident after they selected their mood. No user message from them yet—this is your opening.' }],
    });
    const text = response.content?.find((c) => c.type === 'text')?.text?.trim() || "Thanks for checking in. How has your day been?";
    return text;
  } catch (err) {
    console.error('[Welfare AI] getFirstWelfareMessage error:', err.message || err);
    return "Thanks for checking in. I'm here if you'd like to share how your day has been—type or speak whenever you're ready.";
  }
}

/**
 * Continue the conversation: user message (text, possibly from voice/transcript) → AI reply.
 * Handles spelling and dyslexia implicitly (Claude interprets naturally).
 */
export async function getNextWelfareMessage(checkIn, userText) {
  const client = getClient();
  if (!client) {
    return "I hear you. Thanks for sharing. Is there anything else you'd like to say?";
  }
  try {
    const guidance = MOOD_GUIDANCE[checkIn.mood] || MOOD_GUIDANCE.neutral;
    const namePart = checkIn.name ? ` Their name is ${checkIn.name}.` : '';
    const system = `You are a warm, supportive welfare check-in assistant.${namePart}
Mood they selected: ${checkIn.mood}. ${guidance}
The resident may use voice-to-text so expect informal language, possible spelling or grammar issues, and dyslexia—interpret their meaning kindly. Keep your replies concise (2-4 sentences). Do not diagnose or give medical advice. If they seem to be wrapping up, you can gently close the check-in.`;
    const messages = [
      ...checkIn.conversation.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: userText },
    ];
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      system,
      messages,
    });
    const text = response.content?.find((c) => c.type === 'text')?.text?.trim() || "Thanks for sharing. I'm here if you need to talk more.";
    return text;
  } catch (err) {
    console.error('[Welfare AI] getNextWelfareMessage error:', err.message || err);
    return "I hear you. Thanks for sharing. Is there anything else you'd like to say?";
  }
}
