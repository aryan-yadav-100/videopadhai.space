"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { validateTopic } from "../lib/validation/inputvalidation";
import { useBackendIds } from "../lib/backendIdsContext";
import { getQuickPromptVideo, quickPromptTexts } from "../lib/quickPromptVideos";

interface ChatProps {
  onChatActivate?: () => void;
}

export const Chat = ({ onChatActivate }: ChatProps) => {
  const [message, setMessage] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasActivatedRef = useRef(false);
  const router = useRouter();

  const { setBackendIds, setQuickPromptData } = useBackendIds();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const result = validateTopic(message);
    if (!result.success) {
      const firstError =
        result.error?._errors?.[0] ||
        Object.values(result.error || {})[0]?._errors?.[0] ||
        "Invalid input";
      setError(firstError);
      return;
    }
    setError(null);
    setLoading(true);

    // Check if this is a quick prompt
    const quickPromptVideo = getQuickPromptVideo(message);

    if (quickPromptVideo) {
      // Handle quick prompt flow
      setQuickPromptData({
        youtubeUrl: quickPromptVideo,
        prompt: message
       });
      
      // Navigate to loading page with quick prompt flag
      router.push("/loading-page");
      setLoading(false);
      setMessage("");
      return;
    }

    // Regular backend flow
    try {
      const response = await fetch(
        "https://us-central1-animation-padhaai-88646.cloudfunctions.net/processWorkflow1HTTP",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://www.videopadhai.space/",
          },
          body: JSON.stringify({
            topic: result.data,
           
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);

      if (data.success) {
        setBackendIds({ userId: data.userId, chatId: data.chatId });
      }

      router.push("/loading-page");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      setMessage("");
    }
  };

  const handleChange = (val: string) => {
    setMessage(val.slice(0, 50));
    setError(null);
    
    // Trigger hero hide when user starts typing
    if (val.length > 0 && !hasActivatedRef.current && onChatActivate) {
      hasActivatedRef.current = true;
      onChatActivate();
    }
  };

  const isDisabled = !message.trim() || message.length >= 50 || loading;

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-h-screen pt-20 sm:pt-28 md:pt-36">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="max-w-3xl mx-auto flex flex-col gap-5"
      >
        {/* Quick Prompt Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {quickPromptTexts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleChange(prompt)}
              className="w-full text-left px-3 py-2 cursor-pointer font-mono bg-[#F2F2F2] text-neutral-800 dark:text-neutral-50 dark:bg-black border border-neutral-400 dark:border-neutral-700 rounded-md hover:bg-orange-400 hover:border-orange-400 dark:hover:border-orange-400 dark:hover:bg-orange-400 transition-colors text-sm dark:hover:text-black"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Box */}
        <div className="border bg-white dark:bg-neutral-900 rounded-3xl p-4">
          <div className="flex items-start gap-2 h-20">
            <textarea
              ref={textareaRef}
              rows={1}
              value={message}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="What do you want to learn today?"
              className="flex-1 resize-none outline-none text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 max-h-40 overflow-y-auto font-mono bg-transparent tracking-tighter"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isDisabled) handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={isDisabled}
              className="p-2 text-white bg-orange-500 rounded-full disabled:opacity-50 disabled:cursor-not-allowed h-9 hover:bg-orange-600 active:bg-orange-500 transition-colors"
              type="button"
              aria-label="Send"
            >
              {loading ? "..." : <Send size={20} />}
            </button>
          </div>

          <div className="flex justify-end mt-2">
            <p
              className={`text-sm font-mono ${
                message.length >= 50
                  ? "text-red-500"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {message.length}/50
            </p>
          </div>

          {/* <div className="flex gap-3 items-center mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-1.5 bg-orange-500 rounded-md hover:bg-orange-600 text-white text-sm font-mono transition-colors cursor-pointer">
                  {language
                    ? language.charAt(0).toUpperCase() + language.slice(1)
                    : "Language"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white text-black border border-neutral-300 dark:border-neutral-700 dark:text-white dark:bg-black cursor-pointer">
                <DropdownMenuItem
                  onClick={() => setLanguage("english")}
                  className="cursor-pointer"
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("hindi")} className="cursor-pointer">
                  Hindi
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {error && (
              <p className="text-red-500 text-sm font-mono">{error}</p>
            )}
          </div> */}
        </div>
      </motion.div>
    </section>
  );
};

export default Chat;