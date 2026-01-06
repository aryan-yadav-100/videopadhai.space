// lib/firebase.ts
// Works with TypeScript + Next.js and doesn't require Firebase to be installed yet

// Temporary stub until firebase is installed
type Unsubscribe = () => void;

// Flag to disable Firebase
const DISABLED = process.env.NEXT_PUBLIC_FIREBASE_DISABLED === "true";

// Default stubs
let db: any = {};
let hasFirebase = false;

// Try to initialize real Firebase if available
if (!DISABLED) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebase = require("firebase/app");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getFirestore } = require("firebase/firestore");

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const app = firebase.initializeApp(firebaseConfig);
    db = getFirestore(app);
    hasFirebase = true;
  } catch {
    // firebase not installed or not configured
    hasFirebase = false;
  }
}

// --- Wrappers ---

export function doc(dbRef: any, ...args: any[]) {
  if (hasFirebase) {
    const { doc: realDoc } = require("firebase/firestore");
    return realDoc(dbRef, ...args);
  }
  return { __stub: true, path: args.join("/") };
}

export function onSnapshot(docRef: any, cb: (snap: any) => void): Unsubscribe {
  if (hasFirebase) {
    const { onSnapshot: realOnSnapshot } = require("firebase/firestore");
    return realOnSnapshot(docRef, cb);
  }

  // Stub behavior
  const fakeSnap = {
    exists: () => false,
    data: () => ({}),
  };
  setTimeout(() => cb(fakeSnap), 0);
  return () => {};
}

// Export db last
export { db };
