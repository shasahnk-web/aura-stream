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
  song_data: Song;
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
  queue: Song[];
  participants: RoomMember[];
  created_at: string;
  updated_at: string;
}

interface RoomState {
  currentRoom: Room | null;
  members: RoomMember[];
  messages: RoomMessage[];
  songRequests: SongRequest[];
  isHost: boolean;
  userName: string;
  channel: RealtimeChannel | null;
  syncStatus: 'synced' | 'adjusting' | 'disconnected';
  lastSyncTime: number;

  // Actions
  setUserName: (name: string) => void;
  createRoom: (userId: string, userName: string) => Promise<void>;
  joinRoom: (roomId: string, userId: string, userName: string) => Promise<void>;
  leaveRoom: (userId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  updatePlayback: (song: Song | null, isPlaying: boolean, time: number) => Promise<void>;

  // Song requests and queue
  requestSong: (song: Song) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
  addToQueue: (song: Song) => Promise<void>;
  removeFromQueue: (index: number) => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;

  // Sync functionality
  seekTo: (time: number) => Promise<void>;
  nextSong: () => Promise<void>;
  syncState: () => Promise<void>;

  // Internal
  subscribeToRoom: (roomId: string) => void;
  unsubscribe: () => void;
  assignNewHost: () => Promise<void>;
}

function generateRoomId(): string {
  return `ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  members: [],
  messages: [],
  songRequests: [],
  isHost: false,
  userName: '',
  channel: null,
  syncStatus: 'disconnected',
  lastSyncTime: 0,

  setUserName: (name) => {
    localStorage.setItem('kanako-user-name', name);
    set({ userName: name });
  },

  createRoom: async (userId, userName) => {
    const roomId = generateRoomId();
    const roomData = {
      id: roomId,
      host_id: userId,
      room_name: `${userName}'s Room`,
      current_song: null,
      is_playing: false,
      playback_time: 0,
      queue: [],
      participants: [],
    };

    const { error: roomError } = await supabase.from('rooms').insert(roomData);
    if (roomError) throw roomError;

    const { error: memberError } = await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: userId,
      user_name: userName,
    });
    if (memberError) throw memberError;

    set({
      currentRoom: roomData as Room,
      isHost: true,
      userName,
    });

    get().subscribeToRoom(roomId);
  },

  joinRoom: async (roomId, userId, userName) => {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) throw new Error('Room not found');

    const { error: memberError } = await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: userId,
      user_name: userName,
    });
    if (memberError) throw memberError;

    set({
      currentRoom: room as Room,
      isHost: room.host_id === userId,
      userName,
    });

    get().subscribeToRoom(roomId);
  },

  leaveRoom: async (userId) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    await supabase.from('room_members').delete().eq('user_id', userId);
    get().unsubscribe();

    set({
      currentRoom: null,
      members: [],
      messages: [],
      songRequests: [],
      isHost: false,
    });
  },

  sendMessage: async (message) => {
    const { currentRoom, userName } = get();
    if (!currentRoom) return;

    await supabase.from('room_messages').insert({
      room_id: currentRoom.id,
      user_name: userName,
      message,
    });
  },

  updatePlayback: async (song, isPlaying, time) => {
    const { currentRoom, channel } = get();
    if (!currentRoom) return;

    await supabase.from('rooms').update({
      current_song: song as any,
      is_playing: isPlaying,
      playback_time: time,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);

    channel?.send({
      type: 'broadcast',
      event: 'playback',
      payload: { song, isPlaying, time },
    });

    set({
      currentRoom: { ...currentRoom, current_song: song, is_playing: isPlaying, playback_time: time },
      lastSyncTime: Date.now(),
    });
  },

  requestSong: async (song) => {
    const { currentRoom, userName } = get();
    if (!currentRoom) return;

    await supabase.from('song_requests').insert({
      room_id: currentRoom.id,
      song_data: song as any,
      requested_by: userName,
    });
  },

  updateRequestStatus: async (requestId, status) => {
    const { isHost } = get();
    if (!isHost) return;

    await supabase.from('song_requests').update({
      status: status,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId);

    // Update local state
    const { songRequests } = get();
    const updatedRequests = songRequests.map(req =>
      req.id === requestId ? { ...req, status } : req
    );
    set({ songRequests: updatedRequests });
  },

  addToQueue: async (song) => {
    const { currentRoom, isHost } = get();
    if (!currentRoom || !isHost) return;

    const newQueue = [...(currentRoom.queue || []), song];
    await supabase.from('rooms').update({
      queue: newQueue as any,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);

    set({ currentRoom: { ...currentRoom, queue: newQueue } });
  },

  removeFromQueue: async (index) => {
    const { currentRoom, isHost } = get();
    if (!currentRoom || !isHost || !currentRoom.queue) return;

    const newQueue = [...currentRoom.queue];
    newQueue.splice(index, 1);

    await supabase.from('rooms').update({
      queue: newQueue as any,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);

    set({ currentRoom: { ...currentRoom, queue: newQueue } });
  },

  reorderQueue: async (fromIndex, toIndex) => {
    const { currentRoom, isHost } = get();
    if (!currentRoom || !isHost || !currentRoom.queue) return;

    const newQueue = [...currentRoom.queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);

    await supabase.from('rooms').update({
      queue: newQueue as any,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);

    set({ currentRoom: { ...currentRoom, queue: newQueue } });
  },

  seekTo: async (time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;

    await supabase.from('rooms').update({
      playback_time: time,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);

    channel?.send({
      type: 'broadcast',
      event: 'seek',
      payload: { time },
    });

    set({
      currentRoom: { ...currentRoom, playback_time: time },
      lastSyncTime: Date.now(),
    });
  },

  nextSong: async () => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost || !currentRoom.queue || currentRoom.queue.length === 0) return;

    const nextSong = currentRoom.queue[0];
    const newQueue = currentRoom.queue.slice(1);

    await supabase.from('rooms').update({
      current_song: nextSong as any,
      queue: newQueue as any,
      playback_time: 0,
      is_playing: true,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);

    channel?.send({
      type: 'broadcast',
      event: 'next_song',
      payload: { song: nextSong, queue: newQueue },
    });

    set({
      currentRoom: {
        ...currentRoom,
        current_song: nextSong,
        queue: newQueue,
        playback_time: 0,
        is_playing: true
      },
      lastSyncTime: Date.now(),
    });
  },

  syncState: async () => {
    const { currentRoom, channel } = get();
    if (!currentRoom) return;

    channel?.send({
      type: 'broadcast',
      event: 'sync_request',
      payload: {},
    });

    set({ syncStatus: 'adjusting' });
  },

  assignNewHost: async () => {
    const { currentRoom, members } = get();
    if (!currentRoom || members.length === 0) return;

    // Find the next oldest member
    const sortedMembers = members.sort((a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    );
    const newHost = sortedMembers[0];

    await supabase.from('rooms').update({
      host_id: newHost.user_id,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);

    set({
      currentRoom: { ...currentRoom, host_id: newHost.user_id },
      isHost: false, // Current user is no longer host
    });
  },

  subscribeToRoom: (roomId) => {
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
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        set({ messages: [...get().messages, payload.new as RoomMessage] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'song_requests',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        set({ songRequests: [...get().songRequests, payload.new as SongRequest] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'song_requests',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        set({
          songRequests: get().songRequests.map(r =>
            r.id === payload.new.id ? { ...r, status: payload.new.status } : r
          )
        });
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_name: get().userName });

        // Load initial data
        const [membersRes, messagesRes, requestsRes] = await Promise.all([
          supabase.from('room_members').select('*').eq('room_id', roomId),
          supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at'),
          supabase.from('song_requests').select('*').eq('room_id', roomId).order('created_at'),
        ]);

        set({
          members: (membersRes.data || []) as RoomMember[],
          messages: (messagesRes.data || []) as RoomMessage[],
          songRequests: (requestsRes.data || []) as unknown as SongRequest[],
        });
      }
    });

    // Subscribe to seek events
    channel.on('broadcast', { event: 'seek' }, ({ payload }) => {
      const { currentRoom, isHost } = get();
      if (!currentRoom || isHost) return;

      set({
        currentRoom: { ...currentRoom, playback_time: payload.time },
        syncStatus: 'synced',
        lastSyncTime: Date.now(),
      });
    });

    // Subscribe to next song events
    channel.on('broadcast', { event: 'next_song' }, ({ payload }) => {
      const { currentRoom, isHost } = get();
      if (!currentRoom || isHost) return;

      set({
        currentRoom: {
          ...currentRoom,
          current_song: payload.song,
          queue: payload.queue,
          playback_time: 0,
          is_playing: true,
        },
        syncStatus: 'synced',
        lastSyncTime: Date.now(),
      });
    });

    // Subscribe to sync requests
    channel.on('broadcast', { event: 'sync_request' }, () => {
      const { currentRoom, isHost } = get();
      if (!currentRoom || !isHost) return;

      // Send current state to requester
      channel.send({
        type: 'broadcast',
        event: 'sync_response',
        payload: {
          song: currentRoom.current_song,
          isPlaying: currentRoom.is_playing,
          time: currentRoom.playback_time,
          queue: currentRoom.queue,
        },
      });
    });

    // Subscribe to sync responses
    channel.on('broadcast', { event: 'sync_response' }, ({ payload }) => {
      const { currentRoom, isHost } = get();
      if (!currentRoom || isHost) return;

      set({
        currentRoom: {
          ...currentRoom,
          current_song: payload.song,
          is_playing: payload.isPlaying,
          playback_time: payload.time,
          queue: payload.queue,
        },
        syncStatus: 'synced',
        lastSyncTime: Date.now(),
      });
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
