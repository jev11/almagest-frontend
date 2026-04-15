import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, TokenPair } from "@astro-app/astro-client";

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthStore extends AuthState {
  setAuth: (user: UserProfile, tokens: TokenPair) => void;
  updateTokens: (tokens: TokenPair) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),

      updateTokens: (tokens) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      isAuthenticated: () => get().accessToken !== null,
    }),
    {
      name: "almagest-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
