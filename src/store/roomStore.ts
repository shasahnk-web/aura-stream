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
  started_at_ms: number | null;
}

interface RoomState {
  currentRoom: Room | null;
  members: RoomMember[];
  messages: RoomMessage[];
  songRequests: SongRequest[];
  isHost: boolean;
  userName: string;
  channel: RealtimeChannel | null;
  
  setUserName: (name: string) => void;
  createRoom: (userId: string, userName: string) => Promise<string | null>;
  joinRoom: (roomId: string, userId: string, userName: string) => Promise<boolean>;
  leaveRoom: (userId: string) => Promise<void>;
  
  // Host controls - immediate broadcast
  broadcastPlay: (song: Song, time: number) => void;
  broadcastPause: (time: number) => void;
  broadcastSeek: (time: number) => void;
  broadcastSongChange: (song: Song) => void;
  updatePlayback: (song: Song | null, isPlaying: boolean, time: number) => Promise<void>;
  
  // Chat
  sendMessage: (message: string) => Promise<void>;
  
  // Song requests
  requestSong: (song: Song) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
  
  // Internal
  subscribeToRoom: (roomId: string) => void;
  unsubscribe: () => void;
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
  
  setUserName: (name) => {
    localStorage.setItem('kanako-user-name', name);
    set({ userName: name });
  },
  
  createRoom: async (userId, userName) => {
    const roomId = generateRoomId();
    
    const { error } = await supabase.from('rooms').insert({
      id: roomId,
      host_id: userId,
      room_name: `${userName}'s Room`,
    });
    
    if (error) {
      console.error('Failed to create room:', error);
      return null;
    }
    
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
        started_at_ms: null,
      },
      isHost: true,
      userName,
    });
    
    get().subscribeToRoom(roomId);
    return roomId;
  },
  
  joinRoom: async (roomId, userId, userName) => {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (roomError || !room) {
      console.error('Room not found:', roomError);
      return false;
    }
    
    const { error: joinError } = await supabase.from('room_members').upsert({
      room_id: roomId,
      user_id: userId,
      user_name: userName,
    }, { onConflict: 'room_id,user_id' });
    
    if (joinError) {
      console.error('Failed to join room:', joinError);
      return false;
    }
    
    set({
      currentRoom: {
        id: room.id,
        host_id: room.host_id,
        room_name: room.room_name,
        current_song: room.current_song as unknown as Song | null,
        is_playing: room.is_playing,
        playback_time: room.playback_time,
        started_at_ms: room.started_at_ms,
      },
      isHost: room.host_id === userId,
      userName,
    });
    
    get().subscribeToRoom(roomId);
    return true;
  },
  
  leaveRoom: async (userId) => {
    const { currentRoom, isHost } = get();
    if (!currentRoom) return;
    
    get().unsubscribe();
    
    await supabase.from('room_members').delete()
      .eq('room_id', currentRoom.id)
      .eq('user_id', userId);
    
    if (isHost) {
      // Check if other members exist before deleting
      const { data: remainingMembers } = await supabase
        .from('room_members')
        .select('user_id, joined_at')
        .eq('room_id', currentRoom.id)
        .order('joined_at', { ascending: true })
        .limit(1);
      
      if (remainingMembers && remainingMembers.length > 0) {
        // Assign new host to the oldest remaining member
        await supabase.from('rooms').update({
          host_id: remainingMembers[0].user_id,
        }).eq('id', currentRoom.id);
      } else {
        // No members left, delete room
        await supabase.from('rooms').delete().eq('id', currentRoom.id);
      }
    }
    
    set({
      currentRoom: null,
      members: [],
      messages: [],
      songRequests: [],
      isHost: false,
    });
  },
  
  // Immediate broadcast helpers for real-time sync
  broadcastPlay: (song, time) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    const startedAtMs = Date.now() - (time * 1000);
    channel.send({
      type: 'broadcast',
      event: 'playback',
      payload: { song, isPlaying: true, time, startedAtMs },
    });
    // Also persist to DB
    supabase.from('rooms').update({
      current_song: song as any,
      is_playing: true,
      playback_time: time,
      started_at_ms: startedAtMs,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id).then(() => {});
    set({
      currentRoom: { ...currentRoom, current_song: song, is_playing: true, playback_time: time, started_at_ms: startedAtMs }
    });
  },
  
  broadcastPause: (time) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    channel.send({
      type: 'broadcast',
      event: 'playback',
      payload: { song: currentRoom.current_song, isPlaying: false, time, startedAtMs: null },
    });
    supabase.from('rooms').update({
      is_playing: false,
      playback_time: time,
      started_at_ms: null,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id).then(() => {});
    set({
      currentRoom: { ...currentRoom, is_playing: false, playback_time: time, started_at_ms: null }
    });
  },
  
  broadcastSeek: (time) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    const startedAtMs = currentRoom.is_playing ? Date.now() - (time * 1000) : null;
    channel.send({
      type: 'broadcast',
      event: 'seek',
      payload: { time, startedAtMs },
    });
    supabase.from('rooms').update({
      playback_time: time,
      started_at_ms: startedAtMs,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id).then(() => {});
    set({
      currentRoom: { ...currentRoom, playback_time: time, started_at_ms: startedAtMs }
    });
  },
  
  broadcastSongChange: (song) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    const startedAtMs = Date.now();
    channel.send({
      type: 'broadcast',
      event: 'playback',
      payload: { song, isPlaying: true, time: 0, startedAtMs },
    });
    supabase.from('rooms').update({
      current_song: song as any,
      is_playing: true,
      playback_time: 0,
      started_at_ms: startedAtMs,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id).then(() => {});
    set({
      currentRoom: { ...currentRoom, current_song: song, is_playing: true, playback_time: 0, started_at_ms: startedAtMs }
    });
  },
  
  updatePlayback: async (song, isPlaying, time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;
    
    const startedAtMs = isPlaying ? Date.now() - (time * 1000) : null;
    
    await supabase.from('rooms').update({
      current_song: song as any,
      is_playing: isPlaying,
      playback_time: time,
      started_at_ms: startedAtMs,
      updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);
    
    channel?.send({
      type: 'broadcast',
      event: 'playback',
      payload: { song, isPlaying, time, startedAtMs },
    });
    
    set({
      currentRoom: { ...currentRoom, current_song: song, is_playing: isPlaying, playback_time: time, started_at_ms: startedAtMs }
    });
  },
  
  sendMessage: async (message) => {
    const { currentRoom, userName } = get();
    if (!currentRoom || !message.trim()) return;
    
    await supabase.from('room_messages').insert({
      room_id: currentRoom.id,
      user_name: userName,
      message: message.trim(),
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
    
    await supabase.from('song_requests').update({ status }).eq('id', requestId);
  },
  
  subscribeToRoom: (roomId) => {
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: get().userName } },
    });
    
    // Playback broadcasts
    channel.on('broadcast', { event: 'playback' }, ({ payload }) => {
      const { currentRoom, isHost } = get();
      if (!currentRoom || isHost) return;
      
      set({
        currentRoom: {
          ...currentRoom,
          current_song: payload.song,
          is_playing: payload.isPlaying,
          playback_time: payload.time,
          started_at_ms: payload.startedAtMs ?? null,
        }
      });
    });
    
    // Seek broadcasts
    channel.on('broadcast', { event: 'seek' }, ({ payload }) => {
      const { currentRoom, isHost } = get();
      if (!currentRoom || isHost) return;
      
      set({
        currentRoom: {
          ...currentRoom,
          playback_time: payload.time,
          started_at_ms: payload.startedAtMs ?? null,
        }
      });
    });
    
    // Presence
    channel.on('presence', { event: 'sync' }, () => {
      supabase.from('room_members')
        .select('*')
        .eq('room_id', roomId)
        .then(({ data }) => {
          if (data) set({ members: data as RoomMember[] });
        });
    });
    
    // Messages & requests via postgres changes
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
