import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Users, Send, Music, Play, Pause, SkipForward, Check, X, Search, Power } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoomStore, SongRequest } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore, Song } from '@/store/playerStore';
import { useTimeSync } from '@/hooks/useTimeSync';
import { searchSongs } from '@/services/musicApi';
import { toast } from 'sonner';

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentRoom, members, messages, songRequests, isHost,
    joinRoom, leaveRoom, sendMessage, requestSong, updateRequestStatus,
    setPartyMode, endRoom, cursors, sendCursorMove, voteSong, playTrack, syncTime
  } = useRoomStore();
  const { currentSong, isPlaying, setCurrentSong, setIsPlaying, playNext, currentTime, setCurrentTime } = usePlayerStore();
  
  const [chatInput, setChatInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<HTMLDivElement>(null);

  const { syncTime: syncClock } = useTimeSync();
  useEffect(() => {
    syncClock();
  }, []); 

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/together');
      return;
    }

    if (!currentRoom || currentRoom.id !== roomId) {
      const storedName = localStorage.getItem('kanako-user-name') || 'Guest';
      joinRoom(roomId, user.id, storedName).then(result => {
        if (!result.success) {
          toast.error(result.error || 'Room not found or unable to join');
          navigate('/together');
        }
      });
    }
  }, [roomId, user, currentRoom, joinRoom, navigate]);
  
  useEffect(() => {
    if (!isHost || !currentRoom) return;
    
    const interval = setInterval(() => {
      const playerStore = usePlayerStore.getState();
      syncTime(playerStore.currentTime);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isHost, currentRoom]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (requestRef.current) {
      requestRef.current.scrollTop = requestRef.current.scrollHeight;
    }
  }, [songRequests]);

  useEffect(() => {
    let lastEmit = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (Date.now() - lastEmit > 50) {
        sendCursorMove(e.clientX, e.clientY);
        lastEmit = Date.now();
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [sendCursorMove]);
  
  const handleLeave = () => {
    if (user) leaveRoom(user.id);
    navigate('/together');
  };
  
  const handleEndRoom = async () => {
    if (roomId) {
      const result = await endRoom(roomId);
      if (result.success) toast.success('Room ended');
      else toast.error(result.error || 'Failed to end room');
    }
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
    if (isHost) {
      setCurrentSong(song);
      setIsPlaying(true);
      setCurrentTime(0);
      playTrack(song, 0, true);
    }
  };

  const handleTogglePlay = () => {
    if (isHost && currentSong) {
      const newIsPlaying = !isPlaying;
      setIsPlaying(newIsPlaying);
      playTrack(currentSong, currentTime, newIsPlaying);
    }
  };
  
  const handleAcceptRequest = (request: SongRequest) => {
    updateRequestStatus(request.id, 'accepted');
    handlePlaySong(request.song_data);
  };
  
  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden pb-44 md:pb-36">
      {/* Header */}
      <header className="glass border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleLeave}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">{currentRoom.room_name}</h1>
            <p className="text-xs text-muted-foreground">{members.length} member(s)</p>
          </div>
        </div>
        {isHost && (
          <div className="flex items-center gap-2 ml-4">
             <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleEndRoom}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Power className="w-4 h-4 mr-1" /> End
            </Button>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-0 min-w-0 overflow-hidden relative">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Room Header */}
          <div className="room-header p-4 border-b border-border/50 shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-text">Room ID: {roomId}</h3>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyRoomId}>
              <Copy className="w-4 h-4 mr-2" />
              Copy ID
            </Button>
          </div>
          
          {/* Now Playing */}
          <div className="p-4 border-b border-border/50 shrink-0">
            {currentSong ? (
              <>
                <div className="flex items-center gap-4">
                  <img src={currentSong.image} alt={currentSong.name} className="w-16 h-16 rounded-xl object-cover shadow-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{currentSong.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
                  </div>
                  {isHost && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={handleTogglePlay}>
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={playNext}>
                        <SkipForward className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Participants</h3>
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => (
                      <div key={member.user_id} className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/40">
                        <span className="text-xs font-medium truncate max-w-[120px]">{member.user_name}</span>
                        {member.user_id === currentRoom?.host_id && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200">Host</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
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
          </div>
          
          {/* Chat Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className="flex gap-2">
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
          <div className="p-4 border-t border-border/50 shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-secondary/50"
              />
              <Button onClick={handleSendMessage} size="icon"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        </main>
        
        {/* Sidebar - Song Requests */}
        <aside className="flex flex-col w-full md:w-80 border-l border-border/50">
          <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-foreground">Requests</h3>
            <Button variant="outline" size="sm" onClick={() => setShowSearch(true)}>
              <Search className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-4 request-box [&>div]:!block md:w-full" ref={requestRef}>
            {songRequests.filter(r => r.status === 'pending').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {songRequests.filter(r => r.status === 'pending').map((request, i) => (
                  <motion.div 
                    key={i} 
                    className="p-3 rounded-xl glass request-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-3">
                      <img src={request.song_data.image} alt={request.song_data.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{request.song_data.name}</p>
                        <small className="text-xs text-muted-foreground truncate">by {request.requested_by}</small>
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
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>
      </div>
      
      {/* Live Cursors */}
      {Object.entries(cursors).map(([userId, cursor]) => (
        userId !== user?.id && <div key={userId} className="fixed pointer-events-none z-[9999]" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}><span>{cursor.name}</span></div>
      ))}
      
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold">Search Songs</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSearch(false)}><X className="w-4 h-4" /></Button>
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
                <Button onClick={handleSearch} disabled={searching}><Search className="w-4 h-4" /></Button>
              </div>
              
              <ScrollArea className="h-64">
                {searchResults.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer" onClick={() => isHost ? handlePlaySong(song) : handleRequestSong(song)}>
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
    </div>
  );
}
