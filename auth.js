// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp, initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './config.js';
import { state } from './state.js';
import { showScreen, renderClassDashboard } from './ui.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { localCache: persistentLocalCache({}) });

// --- Authentication Logic ---

export function initAuth(authChangeCallback) {
    onAuthStateChanged(auth, authChangeCallback);
}

export function handleLogin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function handleRegister(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export function handlePasswordReset(email) {
    return sendPasswordResetEmail(auth, email);
}

export function handleLogout() {
    return signOut(auth);
}

export async function checkUserActivation(uid) {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() && userDoc.data().activeKey;
}

export async function activateKey(key) {
    const keyRef = doc(db, 'license_keys', key);
    const userRef = doc(db, 'users', state.currentUID);

    await runTransaction(db, async (transaction) => {
        const keyDoc = await transaction.get(keyRef);
        if (!keyDoc.exists()) throw new Error("Clé non trouvée.");
        if (keyDoc.data().used) throw new Error("Clé déjà utilisée par un autre compte.");
        
        transaction.update(keyRef, {
            used: true,
            usedBy: state.currentUID,
            userEmail: auth.currentUser.email,
            usedAt: serverTimestamp()
        });
        transaction.set(userRef, {
            email: auth.currentUser.email,
            activeKey: key,
            keyExpires: keyDoc.data().expires
        });
    });
}