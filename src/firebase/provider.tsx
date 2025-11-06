'use client';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { initializeFirebase } from './index';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextValue {
  auth: Auth;
  firestore: Firestore;
  user: User | null | undefined;
  isUserLoading: boolean;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const { auth, firestore } = useMemo(() => initializeFirebase(), []);
  const [user, isUserLoading] = useAuthState(auth!);

  // This ensures that we don't render anything until Firebase is initialized on the client.
  if (!auth || !firestore) {
    return <div className="flex h-screen w-full items-center justify-center"><p>Conectando ao sistema...</p></div>;
  }

  const value: FirebaseContextValue = {
    auth,
    firestore,
    user,
    isUserLoading,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useAuth() {
  const context = useFirebase();
  if (!context.auth) {
    throw new Error('Firebase Auth not available. Check FirebaseProvider props.');
  }
  return context.auth;
}

export function useFirestore() {
  const context = useFirebase();
  if (!context.firestore) {
    throw new Error('Firestore not available. Check FirebaseProvider props.');
  }
  return context.firestore;
}
