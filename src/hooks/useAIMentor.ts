import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type MentorMode = 'mentor' | 'enhance' | 'ideas' | 'female_companion' | 'male_companion' | 'roadmap';

export const useAIMentor = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    input: string,
    mode: MentorMode = 'mentor'
  ) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const nextHistory = [...messages, userMsg].slice(-20);
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-mentor', {
        body: {
          messages: nextHistory,
          mode,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to get AI response');
      }

      const reply = data?.generatedText || data?.choices?.[0]?.message?.content;
      if (!reply) {
        throw new Error(data?.error || 'Invalid response format from AI');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('AI Mentor error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
};
