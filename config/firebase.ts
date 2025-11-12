import auth, * as RNFAuth from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// NOTE:
// This project is using the native React Native Firebase packages (@react-native-firebase/*).
// On mobile you normally configure the Firebase app via native files:
// - Android: android/app/google-services.json + gradle changes
// - iOS: ios/<Project>/GoogleService-Info.plist + CocoaPods
// If those native files are missing or native initialization didn't run yet, calls like auth() will
// throw "No Firebase App ['DEFAULT'] has been created". The code below adds protective guards
// and clearer error messages so the app doesn't crash during render. For a proper fix, follow
// the README steps to add the native configuration files (preferred) or initialize the app
// manually per the @react-native-firebase docs.

function buildInitError(): Error {
  return new Error(
    "Firebase is not initialized. Add native configuration (google-services.json / GoogleService-Info.plist)\n" +
      "or initialize the app before using Firebase. See https://rnfirebase.io for setup instructions."
  );
}

// Export the auth function (guarded usage recommended via helper methods below)
// Export the raw auth default (namespaced) for callers that still need it
export { auth };
export type { FirebaseAuthTypes };

// Compatibility helpers: prefer modular-style RNFirebase functions when available,
// but fall back to the namespaced `auth()` API to avoid breaking the app.

function tryCallModular(fnName: string, ...args: any[]) {
  const fn = (RNFAuth as any)[fnName];
  if (typeof fn !== 'function') return undefined;
  try {
    // Try calling the modular function directly
    return fn(...args);
  } catch (err) {
    // Some modular signatures accept (app, ...args) instead of (...args)
    try {
      const app = getApp();
      return fn(app, ...args);
    } catch (e) {
      // give up and return undefined so callers can fallback
      return undefined;
    }
  }
}

/**
 * Attach an auth state listener in a way that supports both the new modular API
 * and the legacy namespaced `auth().onAuthStateChanged`.
 * Returns an unsubscribe function.
 */
export const onAuthStateChangedListener = (
  cb: (user: FirebaseAuthTypes.User | null) => void
): (() => void) => {
  // Try modular onAuthStateChanged first
  const modularResult = tryCallModular('onAuthStateChanged', cb);
  if (typeof modularResult === 'function') return modularResult;

  // If modular returned something that looks like an unsubscribe, return it
  if (modularResult && typeof modularResult === 'object' && typeof (modularResult as any).unsubscribe === 'function') {
    return () => (modularResult as any).unsubscribe();
  }

  // Fallback to namespaced API which returns an unsubscribe function
  try {
    const unsub = auth().onAuthStateChanged(cb);
    if (typeof unsub === 'function') return unsub;
  } catch (e) {
    // If auth() isn't initialized, return a no-op unsubscribe and let caller handle loading
    console.warn('Fallback auth().onAuthStateChanged failed:', e);
  }

  return () => {};
};

// Auth helper functions with clearer errors
export const getCurrentUser = (): FirebaseAuthTypes.User | null => {
  try {
    // Prefer modular currentUser if available
    const modular = tryCallModular('getCurrentUser');
    if (modular !== undefined) return modular as FirebaseAuthTypes.User | null;
    return auth().currentUser;
  } catch (e) {
    throw buildInitError();
  }
};

export const signOut = async (): Promise<void> => {
  try {
    // Try modular signOut first
    const modular = tryCallModular('signOut');
    if (modular !== undefined) return await modular;

    return await auth().signOut();
  } catch (error) {
    if (String(error).includes('No Firebase App')) throw buildInitError();
    console.error('Error signing out:', error);
    throw error;
  }
};

export const signInWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<FirebaseAuthTypes.UserCredential> => {
  try {
    // Try modular implementation first
    const modular = tryCallModular('signInWithEmailAndPassword', email, password);
    if (modular !== undefined) return await modular;

    return await auth().signInWithEmailAndPassword(email, password);
  } catch (error) {
    if (String(error).includes('No Firebase App')) throw buildInitError();
    console.error('Error signing in:', error);
    throw error;
  }
};

export const createUserWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<FirebaseAuthTypes.UserCredential> => {
  try {
    const modular = tryCallModular('createUserWithEmailAndPassword', email, password);
    if (modular !== undefined) return await modular;

    return await auth().createUserWithEmailAndPassword(email, password);
  } catch (error) {
    if (String(error).includes('No Firebase App')) throw buildInitError();
    console.error('Error creating user:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    const modular = tryCallModular('sendPasswordResetEmail', email);
    if (modular !== undefined) return await modular;

    return await auth().sendPasswordResetEmail(email);
  } catch (error) {
    if (String(error).includes('No Firebase App')) throw buildInitError();
    console.error('Error sending password reset email:', error);
    throw error;
  }
};