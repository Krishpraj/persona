"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type Me = {
  user: { id: string; email: string | null } | null;
  profile: { first_name: string | null; last_name: string | null } | null;
};

type MeContextValue = Me & {
  loading: boolean;
  refresh: () => Promise<void>;
};

const MeContext = createContext<MeContextValue>({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
});

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Me>({ user: null, profile: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) {
        setState({ user: null, profile: null });
        return;
      }
      const body = (await res.json()) as Me;
      setState({ user: body.user, profile: body.profile });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <MeContext.Provider value={{ ...state, loading, refresh }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe() {
  return useContext(MeContext);
}

export function displayName(me: Me): string | null {
  const first = me.profile?.first_name?.trim();
  if (first) return first;
  const email = me.user?.email;
  if (email) return email.split("@")[0];
  return null;
}
