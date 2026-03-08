import { create } from 'zustand';

interface ProfileState {
  name: string;
  email: string;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  save: () => void;
}

function loadProfile() {
  try {
    const data = localStorage.getItem('kanako-profile');
    return data ? JSON.parse(data) : { name: 'Music Lover', email: '' };
  } catch { return { name: 'Music Lover', email: '' }; }
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...loadProfile(),
  setName: (name) => set({ name }),
  setEmail: (email) => set({ email }),
  save: () => {
    const { name, email } = get();
    localStorage.setItem('kanako-profile', JSON.stringify({ name, email }));
  },
}));
