import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface SettingsState {
  // Backend API
  apiUrl: string;
  requestTimeout: number;

  // Detection Thresholds
  deepfakeThreshold: number;
  elaSensitivity: number;
  hashThreshold: number;
  lsbThreshold: number;

  // Analysis Options
  runEla: boolean;
  runLsb: boolean;
  buildGraph: boolean;
  simulateSocial: boolean;
  doubleCompression: boolean;

  // Actions
  setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  saveToBackend: () => Promise<void>;
  loadFromBackend: (preferences: any) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      apiUrl: 'http://localhost:8000',
      requestTimeout: 60,
      deepfakeThreshold: 50,
      elaSensitivity: 10,
      hashThreshold: 10,
      lsbThreshold: 75,
      runEla: true,
      runLsb: true,
      buildGraph: false,
      simulateSocial: false,
      doubleCompression: true,

      setSetting: (key, value) => set({ [key]: value } as any),

      saveToBackend: async () => {
        const state = get();
        const preferences = {
          apiUrl: state.apiUrl,
          requestTimeout: state.requestTimeout,
          deepfakeThreshold: state.deepfakeThreshold,
          elaSensitivity: state.elaSensitivity,
          hashThreshold: state.hashThreshold,
          lsbThreshold: state.lsbThreshold,
          runEla: state.runEla,
          runLsb: state.runLsb,
          buildGraph: state.buildGraph,
          simulateSocial: state.simulateSocial,
          doubleCompression: state.doubleCompression,
        };

        try {
          const token = localStorage.getItem('auth_token');
          if (!token) return;

          await axios.put(`${state.apiUrl}/api/auth/preferences`, 
            { preferences },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (error) {
          console.error('Failed to save preferences to backend:', error);
        }
      },

      loadFromBackend: (preferences) => {
        if (!preferences) return;
        set({
          apiUrl: preferences.apiUrl ?? 'http://localhost:8000',
          requestTimeout: preferences.requestTimeout ?? 60,
          deepfakeThreshold: preferences.deepfakeThreshold ?? 50,
          elaSensitivity: preferences.elaSensitivity ?? 10,
          hashThreshold: preferences.hashThreshold ?? 10,
          lsbThreshold: preferences.lsbThreshold ?? 75,
          runEla: preferences.runEla ?? true,
          runLsb: preferences.runLsb ?? true,
          buildGraph: preferences.buildGraph ?? false,
          simulateSocial: preferences.simulateSocial ?? false,
          doubleCompression: preferences.doubleCompression ?? true,
        });
      },
    }),
    {
      name: 'fakelineage-settings',
    }
  )
);
