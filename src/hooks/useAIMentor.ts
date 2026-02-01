import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type MentorMode = 'mentor' | 'enhance' | 'ideas' | 'female_companion' | 'male_companion' | 'roadmap';

export const useAIMentor = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor`;

  const sendMessage = useCallback(async (
    input: string,
    mode: MentorMode = 'mentor'
  ) => {
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          mode
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await resp.json();

      if (data.generatedText) {
        updateAssistant(data.generatedText);
      } else if (data.error) {
        throw new Error(`${data.error}: ${data.details || 'Unknown error'}`);
      } else if (data.choices?.[0]?.message?.content) {
        // Fallback if we accidentally used OpenAI wrapper format
        updateAssistant(data.choices[0].message.content);
      } else {
        throw new Error("Invalid response format from AI");
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('AI Mentor error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, CHAT_URL]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
};
