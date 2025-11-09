// app/lib/backendIdsContext.tsx
"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface BackendIdsContextType {
  userId: string | null;
  chatId: string | null;
  signedUrl: string | null;
  quickPromptData: QuickPromptData | null;
  setBackendIds: (ids: { userId: string; chatId: string }) => void;
  setSignedUrl: (url: string) => void;
  setQuickPromptData: (data: QuickPromptData) => void;
  clearQuickPromptData: () => void;
}

export interface QuickPromptData {
  youtubeUrl: string;
  prompt: string;
  language: string;
}

const BackendIdsContext = createContext<BackendIdsContextType | undefined>(undefined);

export const BackendIdsProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [signedUrl, setSignedUrlState] = useState<string | null>(null);
  const [quickPromptData, setQuickPromptDataState] = useState<QuickPromptData | null>(null);

  const setBackendIds = ({ userId, chatId }: { userId: string; chatId: string }) => {
    setUserId(userId);
    setChatId(chatId);
  };

  const setSignedUrl = (url: string) => {
    setSignedUrlState(url);
  };

  const setQuickPromptData = (data: QuickPromptData) => {
    setQuickPromptDataState(data);
  };

  const clearQuickPromptData = () => {
    setQuickPromptDataState(null);
  };

  return (
    <BackendIdsContext.Provider 
      value={{ 
        userId, 
        chatId, 
        signedUrl, 
        quickPromptData,
        setBackendIds, 
        setSignedUrl,
        setQuickPromptData,
        clearQuickPromptData
      }}
    >
      {children}
    </BackendIdsContext.Provider>
  );
};

export const useBackendIds = () => {
  const context = useContext(BackendIdsContext);
  if (!context) throw new Error("useBackendIds must be used within BackendIdsProvider");
  return context;
};