import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Code,
  Lightbulb,
  MessageSquare,
  Loader2,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAIMentor } from '@/hooks/useAIMentor';

const AIMentor = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'mentor' | 'enhance' | 'ideas'>('mentor');
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIMentor();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input, mode);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickPrompts = [
    { icon: Code, text: "Help me debug this code", mode: 'mentor' as const },
    { icon: Lightbulb, text: "Give me project ideas", mode: 'ideas' as const },
    { icon: Sparkles, text: "Improve my post", mode: 'enhance' as const },
  ];

  const modeColors = {
    mentor: 'bg-primary text-primary-foreground',
    enhance: 'bg-purple-500 text-white',
    ideas: 'bg-amber-500 text-white',
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className={`fixed z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isExpanded
              ? 'inset-4 md:inset-8'
              : 'bottom-24 right-4 w-[calc(100%-2rem)] md:w-96 h-[500px] max-h-[70vh]'
              }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Tech Mentor</h3>
                    <p className="text-xs opacity-80">Your personal tech assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearMessages}
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="flex gap-2 mt-3">
                {(['mentor', 'enhance', 'ideas'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${mode === m
                      ? 'bg-white text-primary'
                      : 'bg-white/20 hover:bg-white/30'
                      }`}
                  >
                    {m === 'mentor' ? '💡 Mentor' : m === 'enhance' ? '✨ Enhance' : '🚀 Ideas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="relative flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center py-6">
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="font-semibold text-foreground">Hi! I'm your AI Tech Mentor</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ask me anything about code, tech, or get project ideas!
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Quick prompts</p>
                      {quickPrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setMode(prompt.mode);
                            sendMessage(prompt.text, prompt.mode);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
                        >
                          <div className={`w-8 h-8 rounded-lg ${modeColors[prompt.mode]} flex items-center justify-center`}>
                            <prompt.icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">{prompt.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary text-secondary-foreground rounded-bl-md'
                            }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </motion.div>
                    )}
                  </div>
                )}
                {error && (
                  <div className="mt-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </ScrollArea>

              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                <div className="bg-card/90 border border-border p-6 rounded-2xl shadow-xl max-w-[240px] animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-bold text-lg mb-1">Coming Soon</h4>
                  <p className="text-sm text-muted-foreground leading-tight">
                    Our AI Tech Mentor is getting a massive brain upgrade. Stay tuned!
                  </p>
                </div>
              </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background/50 opacity-50 pointer-events-none">
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    mode === 'mentor'
                      ? "Ask me anything about tech..."
                      : mode === 'enhance'
                        ? "Paste your post content to enhance..."
                        : "Tell me your skills for project ideas..."
                  }
                  className="min-h-[44px] max-h-32 resize-none bg-secondary/50"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Badge variant="secondary" className="text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Powered by AI
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Press Enter to send
                </span>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(AIMentor);
