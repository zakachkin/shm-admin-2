import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  user_id: number;
  login: string;
  full_name?: string;
  gid: number; // 0 - пользователь, 1 - админ
}

interface AuthState {
  user: User | null;
  credentials: string | null; // base64 encoded login:password
  setAuth: (user: User, credentials: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  getAuthHeader: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      credentials: null,
      setAuth: (user, credentials) => {
        set({ user, credentials });
      },
      logout: () => {
        set({ user: null, credentials: null });
      },
      isAuthenticated: () => !!get().credentials,
      isAdmin: () => get().user?.gid === 1,
      getAuthHeader: () => {
        const creds = get().credentials;
        return creds ? `Basic ${creds}` : null;
      },
    }),
    {
      name: 'shm-auth-storage',
    }
  )
);
