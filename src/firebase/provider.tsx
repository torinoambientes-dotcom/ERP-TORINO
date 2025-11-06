'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextValue {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function FirebaseProvider({
  children,
  firebaseApp,
  auth,
  firestore,
}: FirebaseProviderProps) {
  const contextValue = useMemo(
    () => ({
      firebaseApp,
      auth,
      firestore,
    }),
    [firebaseApp, auth, firestore]
  );

  return (
    <FirebaseContext.Provider value={contextValue}>
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
  const { auth } = useFirebase();
  if (!auth) {
    throw new Error('Firebase Auth not available. Check FirebaseProvider props.');
  }
  return auth;
}

export function useUser(): { user: User | null | undefined, isUserLoading: boolean } {
  const auth = useAuth();
  const [user, loading] = useAuthState(auth);
  return { user, isUserLoading: loading };
}

export function useFirestore() {
  const { firestore } = useFirebase();
  if (!firestore) {
    throw new Error('Firestore not available. Check FirebaseProvider props.');
  }
  return firestore;
}

export function useFirebaseApp() {
    const { firebaseApp } = useFirebase();
    if (!firebaseApp) {
        throw new Error('Firebase App not available. Check FirebaseProvider props.');
    }
    return firebaseApp;
}

export function useMemoFirebase<T>(
    factory: () => T,
    deps: React.DependencyList,
  ): (T & {__memo?: boolean}) | null {
    const result = React.useMemo(factory, deps);
    if(result) {
      (result as any).__memo = true;
    }
    return result;
  }
