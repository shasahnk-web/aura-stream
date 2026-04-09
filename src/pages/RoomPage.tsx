import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Users, Send, Music, Play, Pause, SkipForward, Check, X, Search, PartyPopper, UserX, DoorOpen, Crown, VolumeX, Volume2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoomStore, RoomMessage, SongRequest, JoinRequest } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore, Song } from '@/store/playerStore';
import { searchSongs } from '@/services/musicApi';
import { toast } from 'sonner';

const REACTION_EMOJIS = ['🔥', '👏', '💥', '🎉'];

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentRoom, members, messages, songRequests, joinRequests, isHost, userName, reactions, mutedUsers,
    joinRoom, leaveRoom, sendMessage, broadcastPlay, broadcastPause, broadcastSeek, broadcastSongChange,
    requestSong, updateRequestStatus, broadcastPartyMode, broadcastReaction, kickUser, endRoom,
    transferHost, broadcastMuteUser, approveJoin, rejectJoin,
  } = useRoomStore();
  const { currentSong, isPlaying, setCurrentSong, setIsPlaying, setCurrentTime, playNext } = usePlayerStore();
  
  const [chatInput, setChatInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [synced, setSynced] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'members' | 'requests'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Store user ID globally for broadcast handlers
  useEffect(() => {
    if (user) (window as any).__kanako_user_id = user.id;
  }, [user]);
  
  // Expose player state getter for host sync on new joins
  useEffect(() => {
    (window as any).__kanako_player_state = () => usePlayerStore.getState();
    return () => { delete (window as any).__kanako_player_state; };
  }, []);
  
  // Join room on mount
  useEffect(() => {
    if (!roomId || !user) {
      navigate('/together');
      return;
    }
    if (!currentRoom || currentRoom.id !== roomId) {
      const storedName = localStorage.getItem('kanako-user-name') || 'Guest';
      joinRoom(roomId, user.id, storedName);
    }
  }, [roomId, user]);
  
  // Listen for kick / room ended / host transfer / mute events
  useEffect(() => {
    const onKick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (user && detail.userId === user.id) {
        toast.error('You have been removed from the room');
        navigate('/together');
      }
    };
    const onRoomEnded = () => {
      toast.info('The host ended the room');
      navigate('/together');
    };
    const onBecameHost = () => {
      toast.success('You are now the host!');
    };
    const onMute = (e: Event) => {
      const { muted } = (e as CustomEvent).detail;
      if (muted) {
        toast.info('The host muted your audio');
        // Set volume to 0 on the audio element
        const audio = document.querySelector('audio');
        if (audio) audio.volume = 0;
      } else {
        toast.info('The host unmuted your audio');
        const audio = document.querySelector('audio');
        if (audio) audio.volume = 1;
      }
    };
    window.addEventListener('kanako-kick', onKick);
    window.addEventListener('kanako-room-ended', onRoomEnded);
    window.addEventListener('kanako-became-host', onBecameHost);
    window.addEventListener('kanako-mute', onMute);
    return () => {
      window.removeEventListener('kanako-kick', onKick);
      window.removeEventListener('kanako-room-ended', onRoomEnded);
      window.removeEventListener('kanako-became-host', onBecameHost);
      window.removeEventListener('kanako-mute', onMute);
    };
  }, [user, navigate]);
  
  // Listener: sync playback from room state (drift correction - tighter 1s threshold)
  useEffect(() => {
    if (!currentRoom || isHost) return;
    if (currentRoom.current_song) {
      const playerSong = usePlayerStore.getState().currentSong;
      if (!playerSong || playerSong.id !== currentRoom.current_song.id) {
        setCurrentSong(currentRoom.current_song);
      }
    }
    setIsPlaying(currentRoom.is_playing);
    if (currentRoom.is_playing && currentRoom.started_at_ms) {
      const expectedTime = (Date.now() - currentRoom.started_at_ms) / 1000;
      const playerTime = usePlayerStore.getState().currentTime;
      const drift = Math.abs(expectedTime - playerTime);
      if (drift > 1) {
        setCurrentTime(expectedTime);
        setSynced(false);
        setTimeout(() => setSynced(true), 1000);
      }
    } else if (!currentRoom.is_playing) {
      setCurrentTime(currentRoom.playback_time);
    }
  }, [currentRoom?.current_song, currentRoom?.is_playing, currentRoom?.playback_time, currentRoom?.started_at_ms, isHost]);
  
  // Listener: periodic drift correction every 3s
  useEffect(() => {
    if (!currentRoom || isHost) return;
    const interval = setInterval(() => {
      const { currentRoom: cr } = useRoomStore.getState();
      if (!cr || !cr.is_playing || !cr.started_at_ms) return;
      const expectedTime = (Date.now() - cr.started_at_ms) / 1000;
      const playerTime = usePlayerStore.getState().currentTime;
      const drift = Math.abs(expectedTime - playerTime);
      if (drift > 1) {
        setCurrentTime(expectedTime);
        setSynced(false);
        setTimeout(() => setSynced(true), 1000);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentRoom?.id, isHost]);
  
  // Host: periodic sync broadcast every 5s
  useEffect(() => {
    if (!isHost || !currentRoom) return;
    const interval = setInterval(() => {
      const playerState = usePlayerStore.getState();
      if (playerState.currentSong && playerState.isPlaying) {
        const { updatePlayback } = useRoomStore.getState();
        updatePlayback(playerState.currentSong, playerState.isPlaying, playerState.currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isHost, currentRoom]);
  
  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleLeave = async () => {
    if (user) await leaveRoom(user.id);
    navigate('/together');
  };
  
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    toast.success('Room ID copied!');
  };
  
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendMessage(chatInput);
      setChatInput('');
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchSongs(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };
  
  const handleRequestSong = (song: Song) => {
    requestSong(song);
    toast.success('Song requested!');
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery('');
  };
  
  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    broadcastSongChange(song);
  };
  
  const handleTogglePlay = () => {
    const playerState = usePlayerStore.getState();
    if (playerState.isPlaying) {
      setIsPlaying(false);
      broadcastPause(playerState.currentTime);
    } else {
      setIsPlaying(true);
      if (currentSong) broadcastPlay(currentSong, playerState.currentTime);
    }
  };
  
  const handleAcceptRequest = (request: SongRequest) => {
    updateRequestStatus(request.id, 'accepted');
    handlePlaySong(request.song_data);
  };

  const handleEndRoom = async () => {
    await endRoom();
    navigate('/together');
  };

  const handleKick = async (userId: string) => {
    await kickUser(userId);
    toast.success('User removed');
  };

  const handleTransferHost = async (userId: string) => {
    await transferHost(userId);
    toast.success('Host role transferred');
  };

  const handleToggleMute = (userId: string) => {
    const isMuted = mutedUsers.includes(userId);
    broadcastMuteUser(userId, !isMuted);
    toast.success(isMuted ? 'User unmuted' : 'User muted');
  };

  const handleApproveJoin = async (req: JoinRequest) => {
    await approveJoin(req.id, req.user_id, req.user_name, req.room_id);
    toast.success(`${req.user_name} approved`);
  };

  const handleRejectJoin = async (req: JoinRequest) => {
    await rejectJoin(req.id);
    toast.info(`${req.user_name} rejected`);
  };

  const partyMode = currentRoom?.party_mode ?? false;
  const pendingJoinRequests = joinRequests.filter(r => r.status === 'pending');
  
  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    );
  }
  
  return (
    <div className={`flex-1 flex flex-col overflow-hidden pb-[160px] md:pb-28 ${partyMode ? 'party-mode-bg' : ''}`}
      style={partyMode ? { animation: 'party-glow 4s ease-in-out infinite' } : undefined}
    >
      {/* Floating reactions */}
      <div className="fixed inset-0 pointer-events-none z-[100]">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: 0, x: Math.random() * 200 + 50 }}
              animate={{ opacity: 0, y: -150 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute bottom-40 text-3xl"
              style={{ left: `${Math.random() * 70 + 15}%` }}
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="glass border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleLeave}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">{currentRoom.room_name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{roomId}</span>
              <button onClick={handleCopyRoomId} className="hover:text-foreground">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isHost && (
            <Button
              variant={partyMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => broadcastPartyMode(!partyMode)}
              className={partyMode ? 'bg-accent text-accent-foreground' : ''}
            >
              <PartyPopper className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Party</span>
            </Button>
          )}
          {isHost && (
            <Button variant="destructive" size="sm" onClick={() => setShowEndConfirm(true)}>
              <DoorOpen className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">End</span>
            </Button>
          )}
          {/* Join requests badge */}
          {isHost && pendingJoinRequests.length > 0 && (
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setMobileTab('members')}>
                <UserPlus className="w-4 h-4" />
              </Button>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
                {pendingJoinRequests.length}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${synced ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-[10px]">{synced ? 'Synced' : 'Syncing...'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{members.length}</span>
          </div>
        </div>
      </div>
      
      {/* Mobile Tabs */}
      <div className="flex md:hidden border-b border-border/50 shrink-0">
        {(['chat', 'members', 'requests'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              mobileTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            {tab === 'members' ? `Members (${members.length})` : tab === 'requests' ? `Requests (${songRequests.filter(r=>r.status==='pending').length})` : 'Chat'}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Main area */}
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab !== 'chat' ? 'hidden md:flex' : ''}`}>
          {/* Now Playing */}
          <div className="p-4 border-b border-border/50">
            {currentSong ? (
              <div className="flex items-center gap-4">
                <img 
                  src={currentSong.image} 
                  alt={currentSong.name}
                  className={`w-16 h-16 rounded-xl object-cover shadow-lg ${partyMode ? 'animate-pulse' : ''}`}
                  style={partyMode ? { animation: 'party-pulse 1.5s ease-in-out infinite' } : undefined}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{currentSong.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
                </div>
                {isHost && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleTogglePlay}>
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      playNext();
                      setTimeout(() => {
                        const next = usePlayerStore.getState().currentSong;
                        if (next) broadcastSongChange(next);
                      }, 100);
                    }}>
                      <SkipForward className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No song playing</p>
                {isHost && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowSearch(true)}>
                    <Search className="w-4 h-4 mr-1" /> Search Songs
                  </Button>
                )}
              </div>
            )}

            {partyMode && (
              <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border/30">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => broadcastReaction(emoji)}
                    className="text-2xl hover:scale-125 active:scale-90 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Chat */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {msg.user_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{msg.user_name}</p>
                    <p className="text-sm text-foreground">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          
          {/* Chat Input */}
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-secondary/50"
              />
              <Button onClick={handleSendMessage} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Sidebar - Members + Join Requests + Song Requests */}
        <div className={`${mobileTab === 'members' || mobileTab === 'requests' ? 'flex' : 'hidden'} md:flex flex-col md:w-80 border-l border-border/50 flex-1 md:flex-none overflow-hidden`}>
          
          {/* Join Requests (host only) */}
          {isHost && pendingJoinRequests.length > 0 && (
            <div className={`p-4 border-b border-border/50 ${mobileTab === 'requests' ? 'block' : 'hidden md:block'}`}>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Join Requests ({pendingJoinRequests.length})
              </h3>
              <div className="space-y-2">
                {pendingJoinRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded-lg glass">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-accent">{req.user_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm text-foreground">{req.user_name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="default" className="h-7 px-2" onClick={() => handleApproveJoin(req)}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleRejectJoin(req)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          <div className={`p-4 border-b border-border/50 ${mobileTab === 'requests' ? 'hidden md:block' : ''}`}>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Members ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-primary">{m.user_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-foreground">{m.user_name}</span>
                    {m.user_id === currentRoom.host_id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">Host</span>
                    )}
                    {mutedUsers.includes(m.user_id) && (
                      <VolumeX className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                  {isHost && m.user_id !== currentRoom.host_id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleMute(m.user_id)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        title={mutedUsers.includes(m.user_id) ? 'Unmute' : 'Mute'}
                      >
                        {mutedUsers.includes(m.user_id) ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleTransferHost(m.user_id)}
                        className="text-muted-foreground hover:text-accent transition-colors p-1"
                        title="Make Host"
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleKick(m.user_id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Remove user"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Song Requests */}
          <div className={`p-4 border-b border-border/50 flex items-center justify-between ${mobileTab === 'members' ? 'hidden md:flex' : ''}`}>
            <h3 className="font-semibold text-foreground">Song Requests</h3>
            {!isHost && (
              <Button variant="outline" size="sm" onClick={() => setShowSearch(true)}>
                <Search className="w-4 h-4 mr-1" /> Request
              </Button>
            )}
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {songRequests.filter(r => r.status === 'pending').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {songRequests.filter(r => r.status === 'pending').map((request) => (
                  <div key={request.id} className="p-3 rounded-xl glass">
                    <div className="flex items-center gap-3">
                      <img src={request.song_data.image} alt={request.song_data.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{request.song_data.name}</p>
                        <p className="text-xs text-muted-foreground truncate">by {request.requested_by}</p>
                      </div>
                    </div>
                    {isHost && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="flex-1" onClick={() => handleAcceptRequest(request)}>
                          <Check className="w-3 h-3 mr-1" /> Play
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateRequestStatus(request.id, 'rejected')}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold">Search Songs</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSearch(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search for a song..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-64">
                {searchResults.map((song) => (
                  <div 
                    key={song.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
                    onClick={() => isHost ? handlePlaySong(song) : handleRequestSong(song)}
                  >
                    <img src={song.image} alt={song.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{song.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </motion.div>
        </div>
      )}

      {/* End Room Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-6 text-center"
          >
            <DoorOpen className="w-10 h-10 mx-auto mb-3 text-destructive" />
            <h3 className="text-lg font-semibold text-foreground mb-2">End Room?</h3>
            <p className="text-sm text-muted-foreground mb-6">This will remove all members and delete the room permanently.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEndConfirm(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleEndRoom}>End Room</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
