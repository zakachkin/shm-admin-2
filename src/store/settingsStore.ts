import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showHelp: true,
      
      setShowHelp: (show) => {
        set({ showHelp: show });
      },
    }),
    {
      name: 'shm-settings',
    }
  )
);
