"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, db } from "../lib/firebase";
import { useBackendIds } from "../lib/backendIdsContext";
import LoadingCss from "../components/generating-video";

export default function LoadingPage() {
  const { userId, chatId, setSignedUrl, quickPromptData } = useBackendIds();
  const router = useRouter();

  useEffect(() => {
    // Quick prompt flow: just wait 5s then go to download page
    if (quickPromptData) {
      const timer = setTimeout(() => {
        router.push("/download-page");
      }, 5000);

      return () => clearTimeout(timer);
    }

    // Regular backend request - listen to Firestore
    if (!userId || !chatId) {
      console.log("Missing userId or chatId");
      return;
    }

    // FIXED: Listen to the correct Firestore path where Backend 2 saves the video
    const docRef = doc(db, "finalAnswers", chatId);

    console.log(`Listening to Firestore: finalAnswers/${chatId}`);

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        console.log("Document not found yet, waiting for Backend 1 to create it...");
        return;
      }

      const data = docSnap.data();
      console.log("Firestore document data:", data);

      // Check for videoUrl (set by Backend 2 after rendering)
      const videoUrl = data?.videoUrl;
      const renderStatus = data?.renderStatus;

      if (videoUrl && renderStatus === 'completed') {
        console.log("Video URL received from Backend 2:", videoUrl);
        setSignedUrl(videoUrl);
        router.push("/download-page");
      } else if (renderStatus === 'failed') {
        console.error("Render failed:", data?.renderMessage);
        // Optional: Show error to user or redirect to error page
        alert(`Video rendering failed: ${data?.renderMessage || 'Unknown error'}`);
      } else {
        console.log(`Render status: ${renderStatus || 'processing'}`);
      }
    });

    return () => unsub();
  }, [userId, chatId, setSignedUrl, router, quickPromptData]);

  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingCss />
    </div>
  );
}