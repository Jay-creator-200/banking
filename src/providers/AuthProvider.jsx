'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';

/**
 * Exposes the authenticated session context to client components.
 */
export function AuthProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export default AuthProvider;
