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
  
  // Host controls
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
      },
      isHost: true,
      userName,
    });
    
    get().subscribeToRoom(roomId);
    return roomId;
  },
  
  joinRoom: async (roomId, userId, userName) => {
    // Check if room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (roomError || !room) {
      console.error('Room not found:', roomError);
      return false;
    }
    
    // Join as member
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
    
    // If host leaves, delete room
    if (isHost) {
      await supabase.from('rooms').delete().eq('id', currentRoom.id);
    }
    
    set({
      currentRoom: null,
      members: [],
      messages: [],
      songRequests: [],
      isHost: false,
    });
  },
  
  updatePlayback: async (song, isPlaying, time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;
    
    // Update database
    await supabase.from('rooms').update({
      current_song: song as any,
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
          songRequests: (requestsRes.data || []) as SongRequest[],
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
