// app/lib/quickPromptVideos.ts

export interface QuickPrompt {
  prompt: string;
  youtubeUrl: string;
}

export const quickPrompts: QuickPrompt[] = [
  {
    prompt: "explain linked list ?",
    youtubeUrl: "PASTE_YOUTUBE_LINK_HERE_1", // Replace with actual YouTube link
  },
  {
    prompt: "what is a battery ?",
    youtubeUrl: "PASTE_YOUTUBE_LINK_HERE_2", // Replace with actual YouTube link
  },
  {
    prompt: "explain me this math equation 2x + 3 = 7 ?",
    youtubeUrl: "PASTE_YOUTUBE_LINK_HERE_3", // Replace with actual YouTube link
  },
  {
    prompt: "what is serverless architecture ?",
    youtubeUrl: "PASTE_YOUTUBE_LINK_HERE_4", // Replace with actual YouTube link
  },
];

// Helper function to check if a message is a quick prompt
export function getQuickPromptVideo(message: string): string | null {
  const normalizedMessage = message.toLowerCase().trim();
  const match = quickPrompts.find(
    (qp) => qp.prompt.toLowerCase() === normalizedMessage
  );
  return match ? match.youtubeUrl : null;
}

// Export just the prompt texts for the UI
export const quickPromptTexts = quickPrompts.map((qp) => qp.prompt);