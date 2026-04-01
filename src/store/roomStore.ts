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
  updated_at: string;
  party_mode?: boolean;
  last_drop_at?: number;
  started_at_ms?: number | null;
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
  pauseTrack: () => Promise<void>;
  seekTo: (time: number) => Promise<void>;
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
    try {
      let roomId: string = '';
      let attempts = 0;
      const maxAttempts = 10;

      do {
        roomId = generateRoomId();
        attempts++;
        const { data: existing } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', roomId)
          .limit(1);

        if (!existing || existing.length === 0) break;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return { error: 'Failed to generate unique room ID' };
      }

      const roomName = `${userName}'s Room`;
      const initialRoomState = {
        id: roomId,
        host_id: userId,
        room_name: roomName,
        updated_at: new Date().toISOString(),
        party_mode: false,
        is_playing: false,
        playback_time: 0,
        current_song: null,
      };

      const { error } = await supabase.from('rooms').insert(initialRoomState);
      if (error) return { error: error.message };

      await supabase.from('room_members').insert({ room_id: roomId, user_id: userId, user_name: userName });
      
      set({
        currentRoom: initialRoomState as Room,
        isHost: true,
        userId,
        userName,
        songRequests: [],
        members: [{ user_id: userId, user_name: userName, joined_at: new Date().toISOString() }],
        messages: [],
      });

      get().subscribeToRoom(roomId);
      return { id: roomId };
    } catch (error: unknown) {
      return { error: (error as Error)?.message || 'Unknown error' };
    }
  },
  
  joinRoom: async (roomId, userId, userName) => {
    try {
      const normalizedRoomId = roomId.toUpperCase().trim();
      const finalRoomId = /^\d{4}$/.test(normalizedRoomId) ? `ROOM-${normalizedRoomId}` : normalizedRoomId;
      
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', finalRoomId)
        .maybeSingle();

      if (roomError || !roomData) return { success: false, error: 'Room not found' };
      
      await supabase.from('room_members').upsert(
        { room_id: finalRoomId, user_id: userId, user_name: userName },
        { onConflict: 'room_id,user_id' }
      );

      const roomCast = roomData as unknown as Room;

      set({
        currentRoom: roomCast,
        isHost: roomCast.host_id === userId,
        userId,
        userName,
      });

      // Force sync on join — calculate drift from last update
      if (roomCast.current_song) {
        const { setCurrentSong, setIsPlaying, setCurrentTime } = usePlayerStore.getState();
        setCurrentSong(roomCast.current_song);

        if (roomCast.is_playing && roomCast.started_at_ms) {
          const elapsed = (Date.now() - roomCast.started_at_ms) / 1000;
          const newTime = roomCast.playback_time + elapsed;
          setCurrentTime(newTime);
          setIsPlaying(true);
        } else {
          setCurrentTime(roomCast.playback_time);
          setIsPlaying(roomCast.is_playing);
        }
      }
      
      get().subscribeToRoom(finalRoomId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error)?.message || 'Unknown error' };
    }
  },
  
  leaveRoom: async (userId) => {
    const { currentRoom, isHost } = get();
    if (!currentRoom) return;

    await supabase.from('room_members').delete().eq('room_id', currentRoom.id).eq('user_id', userId);

    if (isHost) {
      const { data: members } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', currentRoom.id)
        .order('joined_at');

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

    const now = Date.now();
    const roomState = {
      current_song: song as unknown as Record<string, unknown>,
      is_playing: true,
      playback_time: time,
      started_at_ms: now,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('rooms').update(roomState).eq('id', currentRoom.id);

    set({ currentRoom: { ...currentRoom, ...roomState, current_song: song, is_playing: true, playback_time: time, started_at_ms: now } });

    channel?.send({
      type: 'broadcast',
      event: 'sync_play',
      payload: { song, currentTime: time, started_at_ms: now, is_playing: true },
    });
  },

  pauseTrack: async () => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;

    const { currentTime } = usePlayerStore.getState();
    const roomState = {
      is_playing: false,
      playback_time: currentTime,
      started_at_ms: null,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('rooms').update(roomState).eq('id', currentRoom.id);
    set({ currentRoom: { ...currentRoom, ...roomState, is_playing: false, playback_time: currentTime, started_at_ms: null } });

    channel?.send({
      type: 'broadcast',
      event: 'sync_pause',
      payload: { currentTime },
    });
  },

  seekTo: async (time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;

    const now = Date.now();
    const roomState = {
      playback_time: time,
      started_at_ms: currentRoom.is_playing ? now : null,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('rooms').update(roomState).eq('id', currentRoom.id);
    set({ currentRoom: { ...currentRoom, ...roomState, playback_time: time, started_at_ms: currentRoom.is_playing ? now : null } });

    channel?.send({
      type: 'broadcast',
      event: 'sync_seek',
      payload: { currentTime: time, started_at_ms: currentRoom.is_playing ? now : null },
    });
  },

  syncTime: async (time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;
    
    channel?.send({
      type: 'broadcast',
      event: 'sync_time',
      payload: { currentTime: time, timestamp: Date.now() },
    });
  },

  setPartyMode: async (enabled) => {
    const { currentRoom, isHost } = get();
    if (!currentRoom || !isHost) return;
    await supabase.from('rooms').update({ party_mode: enabled }).eq('id', currentRoom.id);
    set({ currentRoom: { ...currentRoom, party_mode: enabled } });
  },

  emitBeatDrop: async (time) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    channel.send({ type: 'broadcast', event: 'beat_drop', payload: { time } });
    await supabase.from('rooms').update({ last_drop_at: time }).eq('id', currentRoom.id);
  },
  
  sendMessage: async (message) => {
    const { currentRoom, userName, channel } = get();
    if (!currentRoom || !message.trim() || !channel) return;

    const payload = { user_name: userName, message: message.trim() };
    channel.send({ type: 'broadcast', event: 'message', payload });
    // Also add locally for sender
    set(state => ({
      messages: [...state.messages, { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }]
    }));
  },
  
  requestSong: async (song) => {
    const { currentRoom, userName, channel } = get();
    if (!currentRoom || !channel) return;

    const payload = {
      song_data: song,
      requested_by: userName,
      status: 'pending' as const,
    };
    
    channel.send({ type: 'broadcast', event: 'song_request', payload });
    // Add locally for sender
    set(state => ({
      songRequests: [...state.songRequests, { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }]
    }));
  },

  voteSong: async (requestId, vote) => {
    const { songRequests, userId } = get();
    const request = songRequests.find(r => r.id === requestId);
    if (!request || !userId || request.song_data.voters?.includes(userId)) return;

    const currentVotes = request.song_data.votes || 0;
    const updatedVotes = vote === 'up' ? currentVotes + 1 : Math.max(0, currentVotes - 1);

    const updatedSongData = {
      ...request.song_data,
      votes: updatedVotes,
      voters: [...(request.song_data.voters || []), userId],
    };

    // Update locally
    set(state => ({
      songRequests: state.songRequests.map(r =>
        r.id === requestId ? { ...r, song_data: updatedSongData } : r
      )
    }));
  },
  
  updateRequestStatus: async (requestId, status) => {
    const { isHost } = get();
    if (!isHost) return;
    set(state => ({
      songRequests: state.songRequests.map(r =>
        r.id === requestId ? { ...r, status } : r
      )
    }));
  },
  
  sendCursorMove: (x, y) => {
    const { channel, userId, userName } = get();
    if (!channel || !userId) return;
    channel.send({ type: 'broadcast', event: 'cursor_move', payload: { x, y, name: userName } });
  },
  
  subscribeToRoom: async (roomId) => {
    get().unsubscribe();

    const [membersRes, messagesRes, requestsRes] = await Promise.all([
      supabase.from('room_members').select('*').eq('room_id', roomId),
      supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at'),
      supabase.from('song_requests').select('*').eq('room_id', roomId).order('created_at'),
    ]);

    set({
      members: membersRes.data || [],
      messages: messagesRes.data || [],
      songRequests: (requestsRes.data || []) as unknown as SongRequest[],
    });

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: get().userName || 'guest' } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const members: RoomMember[] = [];
        Object.values(presenceState).forEach((presences: any) => {
          const arr = Array.isArray(presences) ? presences : [presences];
          arr.forEach((p: any) => {
            if (p.user_id) {
              members.push({
                user_id: p.user_id,
                user_name: p.user_name || 'Guest',
                joined_at: new Date().toISOString(),
              });
            }
          });
        });
        if (members.length > 0) set({ members });
      })
      .on('broadcast', { event: 'sync_play' }, ({ payload }) => {
        if (get().isHost) return; // Host already has the state
        const { setCurrentSong, setIsPlaying, setCurrentTime } = usePlayerStore.getState();
        if (!payload.song) return;
        
        setCurrentSong(payload.song);
        
        if (payload.started_at_ms) {
          const elapsed = (Date.now() - payload.started_at_ms) / 1000;
          setCurrentTime(payload.currentTime + elapsed);
        } else {
          setCurrentTime(payload.currentTime);
        }
        setIsPlaying(true);

        set(state => ({
          currentRoom: state.currentRoom ? {
            ...state.currentRoom,
            current_song: payload.song,
            is_playing: true,
            playback_time: payload.currentTime,
            started_at_ms: payload.started_at_ms,
          } : null
        }));
      })
      .on('broadcast', { event: 'sync_pause' }, ({ payload }) => {
        if (get().isHost) return;
        const { setIsPlaying, setCurrentTime } = usePlayerStore.getState();
        setIsPlaying(false);
        setCurrentTime(payload.currentTime);

        set(state => ({
          currentRoom: state.currentRoom ? {
            ...state.currentRoom,
            is_playing: false,
            playback_time: payload.currentTime,
            started_at_ms: null,
          } : null
        }));
      })
      .on('broadcast', { event: 'sync_seek' }, ({ payload }) => {
        if (get().isHost) return;
        usePlayerStore.getState().setCurrentTime(payload.currentTime);

        set(state => ({
          currentRoom: state.currentRoom ? {
            ...state.currentRoom,
            playback_time: payload.currentTime,
            started_at_ms: payload.started_at_ms,
          } : null
        }));
      })
      .on('broadcast', { event: 'sync_time' }, ({ payload }) => {
        if (get().isHost) return;
        const { currentTime: localTime } = usePlayerStore.getState();
        // Drift correction: only correct if drift > 2 seconds
        const serverTime = payload.currentTime;
        const networkDelay = (Date.now() - payload.timestamp) / 1000;
        const correctedTime = serverTime + networkDelay;
        
        if (Math.abs(localTime - correctedTime) > 2) {
          usePlayerStore.getState().setCurrentTime(correctedTime);
        }
      })
      .on('broadcast', { event: 'song_request' }, ({ payload }) => {
        // Don't add duplicates from self (we add locally on send)
        const { userName } = get();
        if (payload.requested_by === userName) return;
        set(state => ({
          songRequests: [...state.songRequests, {
            ...payload,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
          }]
        }));
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        // Don't add duplicates from self
        const { userName } = get();
        if (payload.user_name === userName) return;
        set(state => ({
          messages: [...state.messages, {
            ...payload,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
          }]
        }));
      })
      .on('broadcast', { event: 'room_ended' }, () => {
        get().unsubscribe();
        set({ currentRoom: null, members: [], messages: [], songRequests: [], isHost: false });
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        set(state => ({
          cursors: { ...state.cursors, [payload.name]: payload }
        }));
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
