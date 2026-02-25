import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import type { LeaderboardEntry } from './types.ts';

const app = initializeApp({
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

export async function addScore(userId: string, score: number, videoTitle: string): Promise<void> {
  await addDoc(collection(db, 'scores', userId, 'entries'), {
    score,
    videoTitle,
    playedAt: serverTimestamp(),
  });
}

export async function getTopScores(userId: string): Promise<LeaderboardEntry[]> {
  const q = query(collection(db, 'scores', userId, 'entries'), orderBy('score', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const d = doc.data();
    const playedAt = d.playedAt?.toDate ? d.playedAt.toDate() : new Date();
    return { score: d.score, videoTitle: d.videoTitle, playedAt };
  });
}
