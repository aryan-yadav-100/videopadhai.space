"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, db } from "../lib/firebase";
import { useBackendIds } from "../lib/backendIdsContext";
<<<<<<< HEAD
import LoadingCss from "../components/generating-video"; // make sure this is a React component
=======
import LoadingCss from "../components/generating-video";
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)

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
<<<<<<< HEAD
    if (!userId || !chatId) return;

    const docRef = doc(db, "users", userId, "chats", chatId);

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        console.log("Chat document not found yet");
=======
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
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
        return;
      }

      const data = docSnap.data();
<<<<<<< HEAD
      const signedUrl = data?.signedUrl;

      if (signedUrl) {
        console.log("Signed URL from Firestore:", signedUrl);
        setSignedUrl(signedUrl);
        router.push("/download-page");
=======
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
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
      }
    });

    return () => unsub();
  }, [userId, chatId, setSignedUrl, router, quickPromptData]);

  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingCss />
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
