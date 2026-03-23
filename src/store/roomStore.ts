import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayerStore } from './playerStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RoomMember {
  user_id: string;
  user_name: string;
  joined_at: string;
}

export interface RoomMessage {
  id: string;
  user_name: string;
  message: string;
  created_at: string;
}

export interface SongRequest {
  id: string;
  song_data: Song & { votes?: number; voters?: string[] };
  requested_by: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Room {
  id: string;
  host_id: string;
  room_name: string;
  current_song: Song | null;
  is_playing: boolean;
  playback_time: number;
  updated_at: string; // ISO string
  party_mode?: boolean;
  last_drop_at?: number;
}

interface RoomState {
  currentRoom: Room | null;
  members: RoomMember[];
  messages: RoomMessage[];
  songRequests: SongRequest[];
  isHost: boolean;
  userId: string | null;
  userName: string;
  channel: RealtimeChannel | null;
  cursors: { [userId: string]: { x: number; y: number; name: string; avatar?: string } };
  
  setUserName: (name: string) => void;
  createRoom: (userId: string, userName: string) => Promise<{ id?: string; error?: string }>;
  joinRoom: (roomId: string, userId: string, userName: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: (userId: string) => Promise<void>;
  endRoom: (roomId: string) => Promise<{ success: boolean; error?: string }>;  
  
  // Host controls
  playTrack: (song: Song, time: number) => Promise<void>;
  syncTime: (time: number) => Promise<void>;
  setPartyMode: (enabled: boolean) => Promise<void>;
  emitBeatDrop: (time: number) => Promise<void>;
  
  // Chat
  sendMessage: (message: string) => Promise<void>;
  
  // Song requests
  requestSong: (song: Song) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
  voteSong: (requestId: string, vote: 'up' | 'down') => Promise<void>;

  // Internal
  subscribeToRoom: (roomId: string) => void;
  unsubscribe: () => void;
  sendCursorMove: (x: number, y: number) => void;
}

function generateRoomId(): string {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `ROOM-${number}`;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  members: [],
  messages: [],
  songRequests: [],
  isHost: false,
  userId: null,
  userName: '',
  channel: null,
  cursors: {},
  
  setUserName: (name) => {
    try {
      localStorage.setItem('kanako-user-name', name);
    } catch {}
    set({ userName: name });
  },
  
  createRoom: async (userId, userName) => {
    // ... (logic for creating room, unchanged)
    try {
      let roomId: string;
      let attempts = 0;
      const maxAttempts = 10;

      // Generate unique room ID
      do {
        roomId = generateRoomId();
        attempts++;

        const { data: existing, error: checkError } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', roomId)
          .limit(1);

        if (checkError) {
          if (!existing || existing.length === 0) break;
        } else if (!existing || existing.length === 0) {
          break;
        }
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return { error: 'Failed to generate unique room ID' };
      }

      const roomName = `${userName}'s Room`;
      const initialRoomState: Partial<Room> = {
        id: roomId,
        host_id: userId,
        room_name: roomName,
        updated_at: new Date().toISOString(),
        party_mode: false,
      };

      const { error } = await supabase.from('rooms').insert(initialRoomState);
      if (error) return { error: error.message };

      await supabase.from('room_members').insert({ room_id: roomId, user_id: userId, user_name: userName });
      
      set({
        currentRoom: { ...initialRoomState, current_song: null, is_playing: false, playback_time: 0 } as Room,
        isHost: true,
        userId,
        userName,
        songRequests: []
      });

      await get().subscribeToRoom(roomId);
      return { id: roomId };
    } catch (error: unknown) {
      return { error: (error as Error)?.message || 'Unknown error' };
    }
  },
  
  joinRoom: async (roomId, userId, userName) => {
    try {
      const normalizedRoomId = roomId.toUpperCase().trim();
      const finalRoomId = /^\d{4}$/.test(normalizedRoomId) ? `ROOM-${normalizedRoomId}` : normalizedRoomId;
      
      const { data: roomData, error: roomError } = await supabase.from('rooms').select('*').eq('id', finalRoomId).single();
      if (roomError || !roomData) return { success: false, error: 'Room not found' };
      
      await supabase.from('room_members').upsert({ room_id: finalRoomId, user_id: userId, user_name: userName }, { onConflict: 'room_id,user_id' });

      set({
        currentRoom: roomData,
        isHost: roomData.host_id === userId,
        userId,
        userName,
      });

      // Force sync on join
      if (roomData.current_song) {
        const { setCurrentSong, setIsPlaying, setCurrentTime } = usePlayerStore.getState();
        setCurrentSong(roomData.current_song);

        const delay = (Date.now() - new Date(roomData.updated_at).getTime()) / 1000;
        const newTime = roomData.playback_time + delay;
        setCurrentTime(newTime);
        
        if (roomData.is_playing) {
          setIsPlaying(true);
        }
      }
      
      await get().subscribeToRoom(finalRoomId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error)?.message || 'Unknown error' };
    }
  },
  
  leaveRoom: async (userId) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom) return;

    await supabase.from('room_members').delete().eq('room_id', currentRoom.id).eq('user_id', userId);

    if (isHost) {
      const { data: members } = await supabase.from('room_members').select('*').eq('room_id', currentRoom.id).order('joined_at');
      if (members && members.length > 0) {
        await supabase.from('rooms').update({ host_id: members[0].user_id }).eq('id', currentRoom.id);
      } else {
        await supabase.from('rooms').delete().eq('id', currentRoom.id);
      }
    }

    get().unsubscribe();
    set({ currentRoom: null, members: [], messages: [], songRequests: [], isHost: false, userId: null });
  },

  endRoom: async (roomId) => {
    const { isHost, channel } = get();
    if (!isHost) return { success: false, error: 'Only host can end room' };

    channel?.send({ type: 'broadcast', event: 'room_ended', payload: {} });

    await Promise.all([
      supabase.from('room_members').delete().eq('room_id', roomId),
      supabase.from('room_messages').delete().eq('room_id', roomId),
      supabase.from('song_requests').delete().eq('room_id', roomId),
      supabase.from('rooms').delete().eq('id', roomId),
    ]);

    get().unsubscribe();
    set({ currentRoom: null, members: [], messages: [], songRequests: [], isHost: false });
    return { success: true };
  },
  
  playTrack: async (song, time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;

    const roomState = {
      current_song: song,
      is_playing: true,
      playback_time: time,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('rooms').update(roomState).eq('id', currentRoom.id);

    channel?.send({
      type: 'broadcast',
      event: 'sync_play',
      payload: { ...roomState, track: song, currentTime: time }, // Legacy support
    });
  },

  syncTime: async (time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;
    
    channel?.send({
      type: 'broadcast',
      event: 'sync_time',
      payload: { currentTime: time },
    });
  },
  
  sendMessage: async (message) => {
    const { currentRoom, userName, channel } = get();
    if (!currentRoom || !message.trim() || !channel) return;

    const payload = { user_name: userName, message: message.trim() };
    await channel.send({ type: 'broadcast', event: 'message', payload });
  },
  
  requestSong: async (song) => {
    const { currentRoom, userName, channel } = get();
    if (!currentRoom || !channel) return;

    const payload = {
      track: song,
      user: userName,
    };
    
    await channel.send({ type: 'broadcast', event: 'song_request', payload });
  },

  voteSong: async (requestId, vote) => {
    // This would typically be an RPC call to prevent cheating
    const { songRequests, userId } = get();
    const request = songRequests.find(r => r.id === requestId);
    if (!request || !userId || request.song_data.voters?.includes(userId)) return;

    const currentVotes = request.song_data.votes || 0;
    const updatedVotes = vote === 'up' ? currentVotes + 1 : Math.max(0, currentVotes - 1);

    await supabase.from('song_requests').update({
      song_data: {
        ...request.song_data,
        votes: updatedVotes,
        voters: [...(request.song_data.voters || []), userId],
      }
    }).eq('id', requestId);
  },
  
  updateRequestStatus: async (requestId, status) => {
    const { isHost } = get();
    if (!isHost) return;
    await supabase.from('song_requests').update({ status }).eq('id', requestId);
  },
  
  sendCursorMove: (x, y) => {
    const { channel, userId, userName } = get();
    if (!channel || !userId) return;
    channel.send({ type: 'broadcast', event: 'cursor_move', payload: { x, y, name: userName } });
  },
  
  subscribeToRoom: async (roomId) => {
    get().unsubscribe();
    const {-es, messagesRes, requestsRes] = await Promise.all([
      supabase.from('room_members').select('*').eq('room_id', roomId),
      supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at'),
      supabase.from('song_requests').select('*').eq('room_id', roomId).order('created_at'),
    ]);

    set({
      members: membersRes.data || [],
      messages: messagesRes.data || [],
      songRequests: requestsRes.data || [],
    });

    const channel = supabase.channel(`room:${roomId}`, { config: { presence: { key: get().userName } } });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        // This is a simple way to update members from presence. A DB sync is more robust.
        const members = Object.values(presenceState).map((p: any) => ({
          user_id: p.user_id, // You'll need to pass user_id in track()
          user_name: p.user_name,
          joined_at: new Date().toISOString(),
        }));
        set({ members });
      })
      .on('broadcast', { event: 'sync_play' }, ({ payload }) => {
        const { setCurrentSong, setIsPlaying, setCurrentTime } = usePlayerStore.getState();
        if (!payload.track) return;
        
        setCurrentSong(payload.track);
        
        const delay = (Date.now() - new Date(payload.updated_at).getTime()) / 1000;
        const newTime = payload.currentTime + delay;
        setCurrentTime(newTime);
        setIsPlaying(true);
      })
      .on('broadcast', { event: 'sync_time' }, ({ payload }) => {
        const { currentTime: localTime } = usePlayerStore.getState();
        if (Math.abs(localTime - payload.currentTime) > 1) {
          usePlayerStore.getState().setCurrentTime(payload.currentTime);
        }
      })
      .on('broadcast', { event: 'song_request' }, ({ payload }) => {
        set(state => ({ songRequests: [...state.songRequests, { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }] }));
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        set(state => ({ messages: [...state.messages, { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }] }));
      })
      .on('broadcast', { event: 'room_ended' }, () => {
        get().unsubscribe();
        set({ currentRoom: null, members: [], messages: [], songRequests: [], isHost: false });
        // Optionally, navigate the user away or show a modal
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { userId, userName } = get();
          await channel.track({ user_id: userId, user_name: userName });
        }
      });

    set({ channel });
  },
  
  unsubscribe: () => {
    const { channel } = get();
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
