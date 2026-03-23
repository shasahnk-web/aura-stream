import { create } from 'zustand';

export interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  url: string;
  duration: number;
}

export interface Playlist {
  id: string;
  name: string;
  image: string;
  songCount: number;
  songs?: Song[];
}

// Liked songs store with localStorage persistence
interface LikedSongsState {
  likedSongs: Song[];
  isLiked: (id: string) => boolean;
  toggleLike: (song: Song) => void;
}

function loadLiked(): Song[] {
  try {
    const data = localStorage.getItem('kanako-liked-songs');
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveLiked(songs: Song[]) {
  localStorage.setItem('kanako-liked-songs', JSON.stringify(songs));
}

export const useLikedStore = create<LikedSongsState>((set, get) => ({
  likedSongs: loadLiked(),
  isLiked: (id) => get().likedSongs.some(s => s.id === id),
  toggleLike: (song) => {
    const { likedSongs } = get();
    const exists = likedSongs.some(s => s.id === song.id);
    const updated = exists ? likedSongs.filter(s => s.id !== song.id) : [song, ...likedSongs];
    saveLiked(updated);
    set({ likedSongs: updated });
  },
}));

interface PlayerState {
  timeOffset: number;
  setTimeOffset: (offset: number) => void;
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  dominantColor: string | null;
  now: () => number;
  setCurrentSong: (song: Song) => void;
  setQueue: (songs: Song[]) => void;
  playSongFromQueue: (index: number) => void;
  togglePlay: () => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playNext: () => void;
  playPrev: () => void;
  addToQueue: (song: Song) => void;
  setDominantColor: (c: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  timeOffset: 0,
  currentSong: null,
  queue: [],
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  dominantColor: null,
  setTimeOffset: (offset) => set({ timeOffset: offset }),
  now: () => Date.now() + get().timeOffset,
  setCurrentSong: (song) => set({ currentSong: song, isPlaying: true, currentTime: 0 }),
  setQueue: (songs) => set({ queue: songs }),
  playSongFromQueue: (index) => {
    const { queue } = get();
    if (queue[index]) set({ currentSong: queue[index], isPlaying: true, currentTime: 0 });
  },
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () => set((s) => ({
    repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off'
  })),
  playNext: () => {
    const { queue, currentSong, shuffle, repeat } = get();
    if (!currentSong || queue.length === 0) return;
    const idx = queue.findIndex(s => s.id === currentSong.id);
    if (shuffle) {
      const next = Math.floor(Math.random() * queue.length);
      set({ currentSong: queue[next], currentTime: 0, isPlaying: true });
    } else if (idx < queue.length - 1) {
      set({ currentSong: queue[idx + 1], currentTime: 0, isPlaying: true });
    } else if (repeat === 'all') {
      set({ currentSong: queue[0], currentTime: 0, isPlaying: true });
    }
  },
  playPrev: () => {
    const { queue, currentSong, currentTime } = get();
    if (!currentSong) return;
    if (currentTime > 3) { set({ currentTime: 0 }); return; }
    const idx = queue.findIndex(s => s.id === currentSong.id);
    if (idx > 0) set({ currentSong: queue[idx - 1], currentTime: 0, isPlaying: true });
  },
  addToQueue: (song) => set((s) => ({ queue: [...s.queue, song] })),
  setDominantColor: (c) => set({ dominantColor: c }),
}));
