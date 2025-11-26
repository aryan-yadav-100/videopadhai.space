"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, db } from "../lib/firebase";
import { useBackendIds } from "../lib/backendIdsContext";
import LoadingCss from "../components/generating-video"; // make sure this is a React component

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
    if (!userId || !chatId) return;

    const docRef = doc(db, "users", userId, "chats", chatId);

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        console.log("Chat document not found yet");
        return;
      }

      const data = docSnap.data();
      const signedUrl = data?.signedUrl;

      if (signedUrl) {
        console.log("Signed URL from Firestore:", signedUrl);
        setSignedUrl(signedUrl);
        router.push("/download-page");
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
