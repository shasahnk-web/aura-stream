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

export interface JoinRequest {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  status: 'pending' | 'approved' | 'rejected';
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
  party_mode: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  userName: string;
}

interface RoomState {
  currentRoom: Room | null;
  members: RoomMember[];
  messages: RoomMessage[];
  songRequests: SongRequest[];
  joinRequests: JoinRequest[];
  isHost: boolean;
  userName: string;
  channel: RealtimeChannel | null;
  reactions: FloatingReaction[];
  mutedUsers: string[];
  pendingJoin: { roomId: string; status: 'pending' | 'approved' | 'rejected' } | null;
  
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
  
  // Party mode
  broadcastPartyMode: (enabled: boolean) => void;
  broadcastReaction: (emoji: string) => void;
  
  // Host admin
  kickUser: (userId: string) => Promise<void>;
  endRoom: () => Promise<void>;
  transferHost: (newHostId: string) => Promise<void>;
  broadcastMuteUser: (userId: string, muted: boolean) => void;
  
  // Join approval
  requestJoinRoom: (roomId: string, userId: string, userName: string) => Promise<'pending' | 'not_found'>;
  approveJoin: (requestId: string, userId: string, userName: string, roomId: string) => Promise<void>;
  rejectJoin: (requestId: string) => Promise<void>;
  clearPendingJoin: () => void;
  
  // Chat
  sendMessage: (message: string) => Promise<void>;
  
  // Song requests
  requestSong: (song: Song) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'accepted' | 'rejected') => Promise<void>;
  
  // Internal
  subscribeToRoom: (roomId: string) => void;
  subscribeToPendingJoin: (roomId: string, userId: string) => void;
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
  joinRequests: [],
  isHost: false,
  userName: '',
  channel: null,
  reactions: [],
  mutedUsers: [],
  pendingJoin: null,
  
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
        party_mode: false,
      },
      isHost: true,
      userName,
    });
    
    get().subscribeToRoom(roomId);
    return roomId;
  },
  
  // Direct join (used after approval or by host)
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
        party_mode: room.party_mode,
      },
      isHost: room.host_id === userId,
      userName,
      pendingJoin: null,
    });
    
    get().subscribeToRoom(roomId);
    return true;
  },
  
  // Request to join (goes through host approval)
  requestJoinRoom: async (roomId, userId, userName) => {
    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .single();
    
    if (!room) return 'not_found';
    
    // Insert join request
    await supabase.from('join_requests').insert({
      room_id: roomId,
      user_id: userId,
      user_name: userName,
      status: 'pending',
    });
    
    // Broadcast to the room so host sees it in real-time
    const tempChannel = supabase.channel(`room:${roomId}`);
    tempChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await tempChannel.send({ type: 'broadcast', event: 'join_request', payload: { userId, userName } });
        setTimeout(() => supabase.removeChannel(tempChannel), 1000);
      }
    });
    
    set({ pendingJoin: { roomId, status: 'pending' } });
    
    // Subscribe to updates on this join request
    get().subscribeToPendingJoin(roomId, userId);
    
    return 'pending';
  },
  
  subscribeToPendingJoin: (roomId, userId) => {
    const pendingChannel = supabase.channel(`pending-join:${roomId}:${userId}`)
      .on('broadcast', { event: 'join_approved' }, ({ payload }) => {
        if (payload.userId === userId) {
          set({ pendingJoin: { roomId, status: 'approved' } });
          supabase.removeChannel(pendingChannel);
        }
      })
      .on('broadcast', { event: 'join_rejected' }, ({ payload }) => {
        if (payload.userId === userId) {
          set({ pendingJoin: { roomId, status: 'rejected' } });
          supabase.removeChannel(pendingChannel);
        }
      });
    pendingChannel.subscribe();
  },
  
  approveJoin: async (requestId, userId, userName, roomId) => {
    const { isHost } = get();
    if (!isHost) return;
    
    await supabase.from('join_requests').update({ status: 'approved' }).eq('id', requestId);
    
    // Add to room members
    await supabase.from('room_members').upsert({
      room_id: roomId,
      user_id: userId,
      user_name: userName,
    }, { onConflict: 'room_id,user_id' });
    
    // Broadcast approval
    const { channel } = get();
    channel?.send({ type: 'broadcast', event: 'join_approved', payload: { userId } });
    
    // Also broadcast on the pending channel
    const pendingCh = supabase.channel(`pending-join:${roomId}:${userId}`);
    pendingCh.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await pendingCh.send({ type: 'broadcast', event: 'join_approved', payload: { userId } });
        setTimeout(() => supabase.removeChannel(pendingCh), 1000);
      }
    });
    
    // Remove from local join requests
    set({ joinRequests: get().joinRequests.filter(r => r.id !== requestId) });
  },
  
  rejectJoin: async (requestId) => {
    const { isHost, joinRequests } = get();
    if (!isHost) return;
    
    const req = joinRequests.find(r => r.id === requestId);
    await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId);
    
    if (req) {
      const pendingCh = supabase.channel(`pending-join:${req.room_id}:${req.user_id}`);
      pendingCh.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await pendingCh.send({ type: 'broadcast', event: 'join_rejected', payload: { userId: req.user_id } });
          setTimeout(() => supabase.removeChannel(pendingCh), 1000);
        }
      });
    }
    
    set({ joinRequests: get().joinRequests.filter(r => r.id !== requestId) });
  },
  
  clearPendingJoin: () => set({ pendingJoin: null }),
  
  leaveRoom: async (userId) => {
    const { currentRoom, isHost } = get();
    if (!currentRoom) return;
    
    get().unsubscribe();
    
    await supabase.from('room_members').delete()
      .eq('room_id', currentRoom.id)
      .eq('user_id', userId);
    
    if (isHost) {
      const { data: remainingMembers } = await supabase
        .from('room_members')
        .select('user_id, joined_at')
        .eq('room_id', currentRoom.id)
        .order('joined_at', { ascending: true })
        .limit(1);
      
      if (remainingMembers && remainingMembers.length > 0) {
        await supabase.from('rooms').update({
          host_id: remainingMembers[0].user_id,
        }).eq('id', currentRoom.id);
      } else {
        await supabase.from('rooms').delete().eq('id', currentRoom.id);
      }
    }
    
    set({
      currentRoom: null,
      members: [],
      messages: [],
      songRequests: [],
      joinRequests: [],
      isHost: false,
      reactions: [],
      mutedUsers: [],
    });
  },
  
  // Immediate broadcast helpers
  broadcastPlay: (song, time) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    const startedAtMs = Date.now() - (time * 1000);
    channel.send({ type: 'broadcast', event: 'playback', payload: { song, isPlaying: true, time, startedAtMs } });
    supabase.from('rooms').update({
      current_song: song as any, is_playing: true, playback_time: time, started_at_ms: startedAtMs, updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id).then(() => {});
    set({ currentRoom: { ...currentRoom, current_song: song, is_playing: true, playback_time: time, started_at_ms: startedAtMs } });
  },
  
  broadcastPause: (time) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    channel.send({ type: 'broadcast', event: 'playback', payload: { song: currentRoom.current_song, isPlaying: false, time, startedAtMs: null } });
    supabase.from('rooms').update({
      is_playing: false, playback_time: time, started_at_ms: null, updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id).then(() => {});
    set({ currentRoom: { ...currentRoom, is_playing: false, playback_time: time, started_at_ms: null } });
  },
  
  broadcastSeek: (time) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    const startedAtMs = currentRoom.is_playing ? Date.now() - (time * 1000) : null;
    channel.send({ type: 'broadcast', event: 'seek', payload: { time, startedAtMs } });
    supabase.from('rooms').update({
      playback_time: time, started_at_ms: startedAtMs, updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id).then(() => {});
    set({ currentRoom: { ...currentRoom, playback_time: time, started_at_ms: startedAtMs } });
  },
  
  broadcastSongChange: (song) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    const startedAtMs = Date.now();
    channel.send({ type: 'broadcast', event: 'playback', payload: { song, isPlaying: true, time: 0, startedAtMs } });
    supabase.from('rooms').update({
      current_song: song as any, is_playing: true, playback_time: 0, started_at_ms: startedAtMs, updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id).then(() => {});
    set({ currentRoom: { ...currentRoom, current_song: song, is_playing: true, playback_time: 0, started_at_ms: startedAtMs } });
  },
  
  updatePlayback: async (song, isPlaying, time) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;
    const startedAtMs = isPlaying ? Date.now() - (time * 1000) : null;
    await supabase.from('rooms').update({
      current_song: song as any, is_playing: isPlaying, playback_time: time, started_at_ms: startedAtMs, updated_at: new Date().toISOString(),
    }).eq('id', currentRoom.id);
    channel?.send({ type: 'broadcast', event: 'playback', payload: { song, isPlaying, time, startedAtMs } });
    set({ currentRoom: { ...currentRoom, current_song: song, is_playing: isPlaying, playback_time: time, started_at_ms: startedAtMs } });
  },
  
  // Party mode
  broadcastPartyMode: (enabled) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    channel.send({ type: 'broadcast', event: 'party_mode', payload: { enabled } });
    supabase.from('rooms').update({ party_mode: enabled }).eq('id', currentRoom.id).then(() => {});
    set({ currentRoom: { ...currentRoom, party_mode: enabled } });
  },
  
  broadcastReaction: (emoji) => {
    const { channel, currentRoom, userName } = get();
    if (!channel || !currentRoom) return;
    channel.send({ type: 'broadcast', event: 'reaction', payload: { emoji, userName } });
    const id = Math.random().toString(36).slice(2);
    set({ reactions: [...get().reactions, { id, emoji, userName }] });
    setTimeout(() => {
      set({ reactions: get().reactions.filter(r => r.id !== id) });
    }, 2000);
  },
  
  // Host admin
  kickUser: async (userId) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;
    await supabase.from('room_members').delete().eq('room_id', currentRoom.id).eq('user_id', userId);
    channel?.send({ type: 'broadcast', event: 'kick', payload: { userId } });
    const { data } = await supabase.from('room_members').select('*').eq('room_id', currentRoom.id);
    if (data) set({ members: data as RoomMember[] });
  },
  
  endRoom: async () => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;
    channel?.send({ type: 'broadcast', event: 'room_ended', payload: {} });
    await supabase.from('room_members').delete().eq('room_id', currentRoom.id);
    await supabase.from('rooms').delete().eq('id', currentRoom.id);
    get().unsubscribe();
    set({ currentRoom: null, members: [], messages: [], songRequests: [], joinRequests: [], isHost: false, reactions: [], mutedUsers: [] });
  },
  
  transferHost: async (newHostId) => {
    const { currentRoom, isHost, channel } = get();
    if (!currentRoom || !isHost) return;
    
    await supabase.from('rooms').update({ host_id: newHostId }).eq('id', currentRoom.id);
    channel?.send({ type: 'broadcast', event: 'host_transfer', payload: { newHostId } });
    
    set({
      currentRoom: { ...currentRoom, host_id: newHostId },
      isHost: false,
    });
  },
  
  broadcastMuteUser: (userId, muted) => {
    const { channel, currentRoom, isHost } = get();
    if (!channel || !currentRoom || !isHost) return;
    channel.send({ type: 'broadcast', event: 'mute_user', payload: { userId, muted } });
    
    const { mutedUsers } = get();
    if (muted) {
      set({ mutedUsers: [...mutedUsers, userId] });
    } else {
      set({ mutedUsers: mutedUsers.filter(id => id !== userId) });
    }
  },
  
  sendMessage: async (message) => {
    const { currentRoom, userName } = get();
    if (!currentRoom || !message.trim()) return;
    await supabase.from('room_messages').insert({ room_id: currentRoom.id, user_name: userName, message: message.trim() });
  },
  
  requestSong: async (song) => {
    const { currentRoom, userName } = get();
    if (!currentRoom) return;
    await supabase.from('song_requests').insert({ room_id: currentRoom.id, song_data: song as any, requested_by: userName });
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
    
    // Party mode broadcast
    channel.on('broadcast', { event: 'party_mode' }, ({ payload }) => {
      const { currentRoom, isHost } = get();
      if (!currentRoom || isHost) return;
      set({ currentRoom: { ...currentRoom, party_mode: payload.enabled } });
    });
    
    // Reaction broadcast
    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const id = Math.random().toString(36).slice(2);
      set({ reactions: [...get().reactions, { id, emoji: payload.emoji, userName: payload.userName }] });
      setTimeout(() => {
        set({ reactions: get().reactions.filter(r => r.id !== id) });
      }, 2000);
    });
    
    // Kick broadcast
    channel.on('broadcast', { event: 'kick' }, ({ payload }) => {
      const kickedUserId = payload.userId;
      (window as any).__kanako_kicked_user = kickedUserId;
      window.dispatchEvent(new CustomEvent('kanako-kick', { detail: { userId: kickedUserId } }));
    });
    
    // Room ended broadcast
    channel.on('broadcast', { event: 'room_ended' }, () => {
      window.dispatchEvent(new CustomEvent('kanako-room-ended'));
    });
    
    // Host transfer broadcast
    channel.on('broadcast', { event: 'host_transfer' }, ({ payload }) => {
      const { currentRoom } = get();
      if (!currentRoom) return;
      const { newHostId } = payload;
      const myId = (window as any).__kanako_user_id;
      set({
        currentRoom: { ...currentRoom, host_id: newHostId },
        isHost: myId === newHostId,
      });
      if (myId === newHostId) {
        window.dispatchEvent(new CustomEvent('kanako-became-host'));
      }
    });
    
    // Mute broadcast
    channel.on('broadcast', { event: 'mute_user' }, ({ payload }) => {
      const myId = (window as any).__kanako_user_id;
      if (payload.userId === myId) {
        window.dispatchEvent(new CustomEvent('kanako-mute', { detail: { muted: payload.muted } }));
      }
    });
    
    // Join request broadcast (for host to see)
    channel.on('broadcast', { event: 'join_request' }, () => {
      // Refresh join requests from DB
      supabase.from('join_requests')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'pending')
        .then(({ data }) => {
          if (data) set({ joinRequests: data as JoinRequest[] });
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
      
      // Host: broadcast state to new joiners
      const { isHost: amHost, currentRoom: cr } = get();
      if (amHost && cr && cr.current_song) {
        const playerState = (window as any).__kanako_player_state?.();
        if (playerState) {
          const { updatePlayback } = get();
          updatePlayback(playerState.currentSong, playerState.isPlaying, playerState.currentTime);
        }
      }
    });
    
    // Messages & requests via postgres changes
    channel
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        set({ messages: [...get().messages, payload.new as RoomMessage] });
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'song_requests', filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        set({ songRequests: [...get().songRequests, payload.new as SongRequest] });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'song_requests', filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        set({
          songRequests: get().songRequests.map(r => 
            r.id === payload.new.id ? { ...r, status: payload.new.status } : r
          )
        });
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'join_requests', filter: `room_id=eq.${roomId}`,
      }, () => {
        supabase.from('join_requests')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'pending')
          .then(({ data }) => {
            if (data) set({ joinRequests: data as JoinRequest[] });
          });
      });
    
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_name: get().userName });
        
        const [membersRes, messagesRes, requestsRes, joinReqRes] = await Promise.all([
          supabase.from('room_members').select('*').eq('room_id', roomId),
          supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at'),
          supabase.from('song_requests').select('*').eq('room_id', roomId).order('created_at'),
          supabase.from('join_requests').select('*').eq('room_id', roomId).eq('status', 'pending'),
        ]);
        
        set({
          members: (membersRes.data || []) as RoomMember[],
          messages: (messagesRes.data || []) as RoomMessage[],
          songRequests: (requestsRes.data || []) as unknown as SongRequest[],
          joinRequests: (joinReqRes.data || []) as JoinRequest[],
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
