"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, db } from "../lib/firebase";
import { useBackendIds } from "../lib/backendIdsContext";
import GeneratingVideo from "../components/generating-video";

export default function LoadingPage() {
  const { userId, chatId, setSignedUrl, quickPromptData } = useBackendIds();
  const router = useRouter();

  useEffect(() => {
    // Check if this is a quick prompt request
    if (quickPromptData) {
      // Wait 5 seconds then navigate to download page
      const timer = setTimeout(() => {
        router.push("/download-page");
      }, 5000);

      return () => clearTimeout(timer);
    }

    // Regular backend request - listen to Firestore
    if (!userId || !chatId) return;

    const docRef = doc(db, "users", userId, "chats", chatId);

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const signedUrl = docSnap.data().signedUrl;
        if (signedUrl) {
          console.log("Signed URL from Firestore:", signedUrl);
          setSignedUrl(signedUrl);
          router.push("/download-page");
        }
      } else {
        console.log("Chat document not found yet");
      }
    });

    return () => unsub();
  }, [userId, chatId, setSignedUrl, router, quickPromptData]);

  // Get prompt and language for display
  const displayPrompt = quickPromptData?.prompt || "Processing your request";
  const displayLanguage = quickPromptData?.language || "english";

  return (
    <div className="">
      {/* <div className="my-10 h-px w-full absolute inset-x-0 bg-neutral-300 dark:bg-neutral-700"></div> */}
      <div className="">
        <GeneratingVideo prompt={displayPrompt} language={displayLanguage} />
      </div>
    </div>
  );
}