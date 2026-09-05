"use client";

import React, { createContext, useContext } from "react";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string;
}

interface SessionContextValue {
  user: SessionUser | null;
}

const SessionContext = createContext<SessionContextValue>({ user: null });

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ user }}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Access the current authenticated user from any client component inside a layout.
 */
export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
