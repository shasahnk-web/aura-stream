import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Song } from './playerStore';
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
  song_data: Song & { votes: number; voters: string[] };
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
  createRoomDebug: (userId: string, userName: string) => Promise<{ id?: string; error?: string }>;
  joinRoom: (roomId: string, userId: string, userName: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: (userId: string) => Promise<void>;  endRoom: (roomId: string) => Promise<{ success: boolean; error?: string }>;  
  // Host controls
  updatePlayback: (song: Song | null, isPlaying: boolean, time: number) => Promise<void>;
  setPartyMode: (enabled: boolean) => Promise<void>;
  emitBeatDrop: (time: number) => Promise<void>;
  emitPlayTrack: (song: Song, time: number) => Promise<void>;
  
  // Chat
  sendMessage: (message: string) => Promise<void>;
  
  // Song requests
  requestSong: (song: Song) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
  
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
    } catch {
      // ignore localStorage failures (private browsing, etc.)
    }
    set({ userName: name });
  },
  
  createRoom: async (userId, userName) => {
    try {
      let roomId: string;
      let attempts = 0;
      const maxAttempts = 10;

      // Generate unique room ID
      do {
        roomId = generateRoomId();
        attempts++;

        // Check if room ID already exists
        const { data: existing, error: checkError } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', roomId)
          .limit(1);

        if (checkError) {
          console.error('Error checking room existence:', checkError);
          // If there's an error, assume room doesn't exist and continue
          if (!existing || existing.length === 0) break;
        } else if (!existing || existing.length === 0) {
          break;
        }
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        console.error('Failed to generate unique room ID');
        return { error: 'Failed to generate unique room ID' };
      }

      const { error } = await supabase.from('rooms').insert({
        id: roomId,
        host_id: userId,
        room_name: `${userName}'s Room`,
        party_mode: false,
        last_drop_at: null,
      });

      if (error) {
        console.error('Failed to create room:', error);
        return { error: error.message || 'Failed to create room' };
      }

      // Join as member
      await supabase.from('room_members').insert({
        room_id: roomId,
        user_id: userId,
        user_name: userName,
      });

      set({
        currentRoom: {
          id: roomId,
          host_id: userId,
          room_name: `${userName}'s Room`,
          current_song: null,
          is_playing: false,
          playback_time: 0,
          party_mode: false,
          last_drop_at: null,
        },
        isHost: true,
        userId,
        userName,
      });

      await get().subscribeToRoom(roomId);
      return { id: roomId };
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Unexpected error creating room:', err);
      return { error: err?.message || 'Unknown error' };
    }
  },
  
  joinRoom: async (roomId, userId, userName) => {
    try {
      // Normalize room ID (ensure uppercase format)
      const normalizedRoomId = roomId.toUpperCase().trim();

      // Validate room ID format early - allow both ROOM-#### and #### formats
      const isValidFormat = /^ROOM-\d{4}$/.test(normalizedRoomId) || /^\d{4}$/.test(normalizedRoomId);
      const finalRoomId = /^\d{4}$/.test(normalizedRoomId) ? `ROOM-${normalizedRoomId}` : normalizedRoomId;
      
      if (!isValidFormat) {
        const errMsg = `Invalid room ID format. Use ROOM-#### or just ####`;
        console.error(errMsg);
        return { success: false, error: errMsg };
      }

      // Check if already in this room
      const { currentRoom } = get();
      if (currentRoom && currentRoom.id === finalRoomId) {
        // Already in this room, just return success
        return { success: true };
      }

      // Check if room exists with retries (in case of replication delay)
      let room = null;
      let attempts = 0;
      const maxAttempts = 5;  // Increased attempts for more reliability
      const delayMs = 300;  // Reduced delay for faster response

      while (attempts < maxAttempts && !room) {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', finalRoomId)
          .limit(1);

        if (roomError) {
          console.error('Room lookup error:', roomError);
          if (attempts === maxAttempts - 1) {
            return { success: false, error: roomError.message };
          }
        } else if (roomData && roomData.length > 0) {
          room = roomData;
          break;
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      if (!room) {
        const errMsg = `Room not found: ${finalRoomId}`;
        console.error(errMsg);
        return { success: false, error: errMsg };
      }

      const roomData = room[0];

      // Join as member
      const { error: joinError } = await supabase.from('room_members').upsert({
        room_id: finalRoomId,
        user_id: userId,
        user_name: userName,
      }, { onConflict: 'room_id,user_id' });

      if (joinError) {
        console.error('Failed to join room:', joinError);
        return { success: false, error: joinError.message };
      }

      set({
        currentRoom: {
          id: roomData.id,
          host_id: roomData.host_id,
          room_name: roomData.room_name,
          current_song: roomData.current_song as unknown as Song | null,
          is_playing: roomData.is_playing,
          playback_time: roomData.playback_time,
          party_mode: roomData.party_mode ?? false,
          last_drop_at: roomData.last_drop_at ?? null,
        },
        isHost: roomData.host_id === userId,
        userId,
        userName,
      });

      await get().subscribeToRoom(finalRoomId);
      return { success: true };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Unexpected error joining room:', errorMsg);
      return { success: false, error: errorMsg || 'Unknown error' };
    }
  },
  
  leaveRoom: async (userId) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom) return;

    // Remove member record
    await supabase.from('room_members').delete()
      .eq('room_id', currentRoom.id)
      .eq('user_id', userId);

    // If host leaves, promote new host (if any) instead of destroying the room
    if (isHost) {
      const { data: remainingMembers } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', currentRoom.id)
        .order('joined_at', { ascending: true });

      if (remainingMembers && remainingMembers.length > 0) {
        const newHost = remainingMembers[0];
        await supabase.from('rooms').update({ host_id: newHost.user_id }).eq('id', currentRoom.id);

        // Notify remaining members about host change
        channel?.send({
          type: 'broadcast',
          event: 'host_change',
          payload: { newHostId: newHost.user_id },
        });
      } else {
        // No members left; remove room
        await supabase.from('rooms').delete().eq('id', currentRoom.id);
      }
    }

    // Unsubscribe from real-time updates
    get().unsubscribe();

    set({
      currentRoom: null,
      members: [],
      messages: [],
      songRequests: [],
      isHost: false,
      userId: null,
    });
  },

  endRoom: async (roomId) => {
    try {
      // Only host can end room
      const { isHost, channel } = get();
      if (!isHost) {
        return { success: false, error: 'Only host can end room' };
      }

      // Delete all related records
      await Promise.all([
        supabase.from('room_members').delete().eq('room_id', roomId),
        supabase.from('room_messages').delete().eq('room_id', roomId),
        supabase.from('song_requests').delete().eq('room_id', roomId),
        supabase.from('rooms').delete().eq('id', roomId),
      ]);

      // Notify members before unsubscribing
      channel?.send({
        type: 'broadcast',
        event: 'room_ended',
        payload: { roomId },
      });

      // Clean up state
      get().unsubscribe();
      set({
        currentRoom: null,
        members: [],
        messages: [],
        songRequests: [],
        isHost: false,
      });

      return { success: true };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error ending room:', errorMsg);
      return { success: false, error: errorMsg || 'Failed to end room' };
    }
  },
  
  updatePlayback: async (song, isPlaying, time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;

    // Update database
    await supabase.from('rooms').update({
      current_song: song as unknown,
      is_playing: isPlaying,
      playback_time: time,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);

    // Broadcast to all listeners
    channel?.send({
      type: 'broadcast',
      event: 'playback',
      payload: { song, isPlaying, time },
    });

    set({
      currentRoom: { ...currentRoom, current_song: song, is_playing: isPlaying, playback_time: time }
    });
  },

  setPartyMode: async (enabled) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;

    await supabase.from('rooms').update({ party_mode: enabled, updated_at: new Date().toISOString() }).eq('id', currentRoom.id);

    channel?.send({
      type: 'broadcast',
      event: 'party_mode',
      payload: { enabled },
    });

    set({
      currentRoom: { ...currentRoom, party_mode: enabled }
    });
  },

  emitBeatDrop: async (time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;

    // Record the drop moment for late-joiners
    await supabase.from('rooms').update({ last_drop_at: time, updated_at: new Date().toISOString() }).eq('id', currentRoom.id);

    channel?.send({
      type: 'broadcast',
      event: 'beat_drop',
      payload: { time },
    });

    set({
      currentRoom: { ...currentRoom, last_drop_at: time }
    });
  },

  emitPlayTrack: async (song, time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;

    channel?.send({
      type: 'broadcast',
      event: 'play_track',
      payload: { song, time },
    });
  },
  
  sendMessage: async (message) => {
    const { currentRoom, userName, messages } = get();
    if (!currentRoom || !message.trim()) return;

    const trimmed = message.trim();
    const newMessage: RoomMessage = {
      id: crypto.randomUUID(),
      user_name: userName,
      message: trimmed,
      created_at: new Date().toISOString(),
    };

    // Add locally immediately for instant feedback
    set((state) => ({ messages: [...state.messages, newMessage] }));

    const { error } = await supabase.from('room_messages').insert({
      room_id: currentRoom.id,
      user_name: userName,
      message: trimmed,
    });

    if (error) {
      console.error('Failed to send room message', error);
    }
  },
  
  requestSong: async (song) => {
    const { currentRoom, userName, songRequests } = get();
    if (!currentRoom) return;
    
    const newRequest: SongRequest = {
      id: crypto.randomUUID(),
      song_data: song,
      requested_by: userName,
      status: 'pending',
      created_at: new Date().toISOString(),
      votes: 0,
      voters: [],
    };
    
    // Add locally immediately for instant feedback
    set((state) => ({ songRequests: [...state.songRequests, newRequest] }));
    
    await supabase.from('song_requests').insert({
      room_id: currentRoom.id,
      song_data: song as unknown,
      requested_by: userName,
    });
  },
  
  updateRequestStatus: async (requestId, status) => {
    const { isHost } = get();
    if (!isHost) return;
    
    await supabase.from('song_requests').update({ status }).eq('id', requestId);
  },
  
  sendCursorMove: (x, y) => {
    const { channel, userId, userName } = get();
    if (!channel || !userId) return;
    channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { x, y, userId, userName }
    });
  },
  
  subscribeToRoom: async (roomId) => {
    try {
      // First unsubscribe from any existing channel
      get().unsubscribe();
      
      const channel = supabase.channel(`room:${roomId}`, {
        config: { presence: { key: get().userName } },
      });

      // Subscribe to playback broadcasts
      channel.on('broadcast', { event: 'playback' }, ({ payload }) => {
        const { currentRoom, isHost } = get();
        if (!currentRoom || isHost) return;

        set({
          currentRoom: {
            ...currentRoom,
            current_song: payload.song,
            is_playing: payload.isPlaying,
            playback_time: payload.time,
          }
        });
      });

      // Subscribe to host change notifications
      channel.on('broadcast', { event: 'host_change' }, ({ payload }) => {
        const { currentRoom, userId } = get();
        if (!currentRoom) return;
        set({
          currentRoom: {
            ...currentRoom,
            host_id: payload.newHostId,
          },
          isHost: userId ? payload.newHostId === userId : false,
        });
      });

      // Subscribe to party mode toggles
      channel.on('broadcast', { event: 'party_mode' }, ({ payload }) => {
        const { currentRoom } = get();
        if (!currentRoom) return;
        set({
          currentRoom: {
            ...currentRoom,
            party_mode: payload.enabled,
          },
        });
      });

      // Subscribe to beat drop events (for visual effects)
      channel.on('broadcast', { event: 'beat_drop' }, ({ payload }) => {
        const { currentRoom } = get();
        if (!currentRoom) return;
        set({
          currentRoom: {
            ...currentRoom,
            last_drop_at: payload.time,
          },
        });
      });

      // Subscribe to cursor movements
      channel.on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        set((state) => ({
          cursors: {
            ...state.cursors,
            [payload.userId]: {
              x: payload.x,
              y: payload.y,
              name: payload.userName,
            }
          }
        }));
      });

      // Subscribe to play track commands
      channel.on('broadcast', { event: 'play_track' }, ({ payload }) => {
        const { currentRoom, isHost } = get();
        if (!currentRoom || isHost) return;

        // Set song and play
        set({
          currentRoom: {
            ...currentRoom,
            current_song: payload.song,
            is_playing: true,
            playback_time: payload.time,
          }
        });
      });

      // Subscribe to rooms table updates (fallback for playback/host state)
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload: Record<string, unknown>) => {
        const room = payload.new as Room;
        const { userId, currentRoom } = get();
        if (!currentRoom || currentRoom.id !== room.id) return;

        const isHost = userId ? room.host_id === userId : false;

        set({
          currentRoom: {
            ...currentRoom,
            host_id: room.host_id,
            current_song: room.current_song as unknown as Song | null,
            is_playing: room.is_playing,
            playback_time: room.playback_time,
          },
          isHost,
        });
      });

      // Subscribe to presence (online members)
      channel.on('presence', { event: 'sync' }, () => {
        // Refresh members from database
        supabase.from('room_members')
          .select('*')
          .eq('room_id', roomId)
          .then(({ data }) => {
            if (data) set({ members: data as RoomMember[] });
          });
      });

      // Subscribe to new messages
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload: { new: unknown }) => {
        const newMsg = payload.new as RoomMessage;
        set((state) => {
          if (state.messages.some((m) => m.id === newMsg.id)) return state;
          return { messages: [...state.messages, newMsg] };
        });
      })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'song_requests',
          filter: `room_id=eq.${roomId}`,
        }, (payload: { new: unknown }) => {
          set((state) => ({ songRequests: [...state.songRequests, payload.new as SongRequest] }));
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'song_requests',
          filter: `room_id=eq.${roomId}`,
        }, (payload: { new: unknown }) => {
          set({
            songRequests: get().songRequests.map(r => 
              r.id === (payload.new as SongRequest).id ? { ...r, status: (payload.new as SongRequest).status } : r
            )
          });
        });

      // Load initial data BEFORE subscribing
      const [membersRes, messagesRes, requestsRes] = await Promise.all([
        supabase.from('room_members').select('*').eq('room_id', roomId).order('joined_at'),
        supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at'),
        supabase.from('song_requests').select('*').eq('room_id', roomId).order('created_at'),
      ]);

      set({
        members: (membersRes.data || []) as RoomMember[],
        messages: (messagesRes.data || []) as RoomMessage[],
        songRequests: (requestsRes.data || []) as unknown as SongRequest[],
        channel,
      });

      // Then subscribe for real-time updates
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_name: get().userName }).catch(e => console.error('Failed to track presence:', e));
        }
      });
    } catch (error) {
      console.error('Failed to subscribe to room realtime channel', error);
    }
  },
  
  unsubscribe: () => {
    const { channel } = get();
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
