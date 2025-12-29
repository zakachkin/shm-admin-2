import { create } from 'zustand';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { useAuthStore } from './authStore';

export interface BrandingSettings {
  name: string;
  logoUrl: string;
}

interface BrandingState {
  branding: BrandingSettings;
  loading: boolean;
  loaded: boolean;
  fetchBranding: () => Promise<void>;
  refetchBranding: () => Promise<void>;
  updateBranding: (settings: Partial<BrandingSettings>) => Promise<void>;
  resetBranding: () => Promise<void>;
}

const DEFAULT_BRANDING: BrandingSettings = {
  name: 'SHM Admin',
  logoUrl: '',
};

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: DEFAULT_BRANDING,
  loading: false,
  loaded: false,

  fetchBranding: async () => {
    if (get().loaded) return;
    const sessionId = useAuthStore.getState().getSessionId();
    if (!sessionId) {
      set({ branding: DEFAULT_BRANDING, loaded: true });
      document.title = DEFAULT_BRANDING.name;
      return;
    }

    set({ loading: true });
    try {
      // œÓÎÛ˜‡ÂÏ Ì‡ÒÚÓÈÍË ÍÓÏÔ‡ÌËË ËÁ SHM API (admin/config)
      const result = await shm_request('shm/v1/admin/config?key=company');
      const configItem = normalizeListResponse(result).data?.[0];
      const rawValue = configItem?.value ?? configItem?.data ?? configItem;
      let company = rawValue;
      if (typeof rawValue === 'string') {
        try {
          company = JSON.parse(rawValue);
        } catch {
          company = null;
        }
      }
      if (company?.name || company?.title) {
        const branding = {
          name: company.name || DEFAULT_BRANDING.name,
          logoUrl: company.logoUrl || DEFAULT_BRANDING.logoUrl,
        };
        set({ branding, loaded: true });
        document.title = branding.name;
      } else {
        set({ branding: DEFAULT_BRANDING, loaded: true });
        document.title = DEFAULT_BRANDING.name;
      }
    } catch (error) {
      // “ËıÓ Ë„ÌÓËÛÂÏ Ó¯Ë·ÍË (Ì‡ÔËÏÂ, 401 ‰Îˇ ÌÂ‡‚ÚÓËÁÓ‚‡ÌÌ˚ı)
      set({ branding: DEFAULT_BRANDING, loaded: true });
      document.title = DEFAULT_BRANDING.name;
    } finally {
      set({ loading: false });
    }
  },

  refetchBranding: async () => {
    set({ loaded: false });
    await get().fetchBranding();
  },

  updateBranding: async (settings) => {
    set({ loading: true });
    try {
      const newBranding = { ...get().branding, ...settings };

      // –°–æ—Ö—Ä–∞–Ω—è–µ–º –≤ SHM API —á–µ—Ä–µ–∑ admin/config
      const configData = {
        name: newBranding.name,
        logoUrl: newBranding.logoUrl,
      };

      const result = await shm_request('shm/v1/admin/config', {
        method: 'POST',
        body: JSON.stringify({
          key: 'company',
          value: configData
        }),
      });

      // –ü—Ä–æ–≤–µ—Ä—è–µ–º —Å—Ç–∞—Ç—É—Å –æ—Ç–≤–µ—Ç–∞
      if (result.status === 200) {
        set({ branding: newBranding });
        document.title = newBranding.name;
      } else {
        throw new Error(`API returned status ${result.status}`);
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  resetBranding: async () => {
    set({ loading: true });
    try {
      const defaultConfig = {
        name: DEFAULT_BRANDING.name,
        logoUrl: DEFAULT_BRANDING.logoUrl,
      };

      const result = await shm_request('shm/v1/admin/config', {
        method: 'POST',
        body: JSON.stringify({
          key: 'company',
          value: defaultConfig
        }),
      });

      // –ü—Ä–æ–≤–µ—Ä—è–µ–º —Å—Ç–∞—Ç—É—Å –æ—Ç–≤–µ—Ç–∞
      if (result.status === 200) {
        set({ branding: DEFAULT_BRANDING });
        document.title = DEFAULT_BRANDING.name;
      } else {
        throw new Error(`API returned status ${result.status}`);
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
