// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig, WORKER_URL } from './config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { localCache: persistentLocalCache({}) });

export function initAuth(authChangeCallback) {
    onAuthStateChanged(auth, authChangeCallback);
}
export function handleLogin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}
export function handlePasswordReset(email) {
    return sendPasswordResetEmail(auth, email);
}
export function handleLogout() {
    return signOut(auth);
}

/**
 * Sends registration or activation data to the Cloudflare Worker.
 * The worker handles ALL logic.
 */
export async function sendToWorker(payload) {
    const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || 'An unknown error occurred.');
    }
    return result;
}

export async function checkUserActivation(uid) {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() && userDoc.data().activeKey;
}
