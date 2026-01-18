import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Sparkles,
  Search,
  FileText,
  Bell,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAgent } from "@/hooks/useAIAgent";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId?: string;
}

const suggestedQuestions = [
  { icon: Search, text: "Find student by name" },
  { icon: FileText, text: "Summarize class performance" },
  { icon: Bell, text: "Draft parent notification" },
];

export function AIAssistant({ isOpen, onClose, schoolId }: AIAssistantProps) {
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIAgent(schoolId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  const handleSuggestedQuestion = (text: string) => {
    setInput(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-primary to-primary/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-white/70">Powered by SchoolSync</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="text-white hover:bg-white/20"
              title="Clear conversation"
            >
              <Trash2 size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {message.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%]",
                    message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-center text-sm text-destructive bg-destructive/10 rounded-lg p-2">
                {error}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => handleSuggestedQuestion(q.text)}
                >
                  <q.icon size={12} className="mr-1" />
                  {q.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} variant="hero">
              <Send size={18} />
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-2">
            AI actions require your approval before execution
          </p>
        </div>
      </div>
    </div>
  );
}
