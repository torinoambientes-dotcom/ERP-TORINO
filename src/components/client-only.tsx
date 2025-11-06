'use client';

import { useState, useEffect, type ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
}

/**
 * A wrapper component that ensures its children are only rendered on the client-side.
 * This is useful to prevent hydration mismatch errors for components that rely on
 * browser-specific APIs or have logic that should not run on the server.
 */
export function ClientOnly({ children }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}
