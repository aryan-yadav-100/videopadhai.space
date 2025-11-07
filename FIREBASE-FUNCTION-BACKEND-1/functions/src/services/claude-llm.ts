import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-testing'
});

const isMockMode = !process.env.OPENAI_API_KEY;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Send messages to GPT and get response
 */
export const sendToGPT = async (messages: ChatMessage[]): Promise<string> => {
  if (isMockMode) {
    // Simple mock responses based on message count
    if (messages.length === 1) return 'Mock follow-up question';
    if (messages.length === 3) return 'Mock final answer';
    return 'Mock GPT response';
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    max_tokens: 1500,
    temperature: 0.7
  });

  return completion.choices[0]?.message?.content || '';
};