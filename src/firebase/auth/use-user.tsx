'use client';

import { useFirebase } from '@/firebase';
import type { User } from 'firebase/auth';

export function useUser(): { user: User | null | undefined, isUserLoading: boolean } {
  const { user, isUserLoading } = useFirebase();
  return { user, isUserLoading };
}
