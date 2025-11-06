'use client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

// A new component to handle the auth state logic safely.
function AuthStateProvider({ auth, firestore, children }: { auth: Auth, firestore: Firestore, children: ReactNode }) {
    const [user, isUserLoading] = useAuthState(auth);

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


export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [firebaseServices, setFirebaseServices] = useState<{ auth: Auth; firestore: Firestore; } | null>(null);

  useEffect(() => {
    // initializeFirebase now correctly returns null on server,
    // so we only call it inside useEffect which runs on the client.
    const services = initializeFirebase();
    if (services.auth && services.firestore) {
      setFirebaseServices({ auth: services.auth, firestore: services.firestore });
    }
  }, []);

  // Render a loading state until Firebase is fully initialized on the client.
  if (!firebaseServices) {
    return <div className="flex h-screen w-full items-center justify-center"><p>Conectando ao sistema...</p></div>;
  }

  // Once initialized, render the provider that will manage auth state and provide context.
  return (
    <AuthStateProvider auth={firebaseServices.auth} firestore={firebaseServices.firestore}>
        {children}
    </AuthStateProvider>
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
    // This should theoretically not be hit if the provider logic is correct.
    throw new Error('Firebase Auth not available. Check FirebaseProvider props.');
  }
  return context.auth;
}

export function useFirestore() {
  const context = useFirebase();
  if (!context.firestore) {
    // This should theoretically not be hit.
    throw new Error('Firestore not available. Check FirebaseProvider props.');
  }
  return context.firestore;
}
