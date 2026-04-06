import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Users, Send, Music, Play, Pause, SkipForward, Check, X, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoomStore, RoomMessage, SongRequest } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore, Song } from '@/store/playerStore';
import { searchSongs } from '@/services/musicApi';
import { toast } from 'sonner';

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentRoom, members, messages, songRequests, isHost, userName,
    joinRoom, leaveRoom, sendMessage, updatePlayback, requestSong, updateRequestStatus 
  } = useRoomStore();
  const { currentSong, isPlaying, setCurrentSong, setIsPlaying, playNext } = usePlayerStore();
  
  const [chatInput, setChatInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Join room on mount if not already joined
  useEffect(() => {
    if (!roomId || !user) {
      navigate('/together');
      return;
    }
    
    if (!currentRoom || currentRoom.id !== roomId) {
      const storedName = localStorage.getItem('kanako-user-name') || 'Guest';
      joinRoom(roomId, user.id, storedName);
    }
    
    return () => {
      // Don't leave on unmount, only on explicit leave
    };
  }, [roomId, user]);
  
  // Sync playback for non-hosts
  useEffect(() => {
    if (!currentRoom || isHost) return;
    
    if (currentRoom.current_song) {
      setCurrentSong(currentRoom.current_song);
    }
    setIsPlaying(currentRoom.is_playing);
  }, [currentRoom?.current_song, currentRoom?.is_playing, isHost]);
  
  // Host broadcasts playback state
  useEffect(() => {
    if (!isHost || !currentRoom) return;
    
    const interval = setInterval(() => {
      updatePlayback(currentSong, isPlaying, 0);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isHost, currentSong, isPlaying]);
  
  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleLeave = async () => {
    if (user) {
      await leaveRoom(user.id);
    }
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
    updatePlayback(song, true, 0);
  };
  
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    if (isHost) {
      updatePlayback(currentSong, !isPlaying, 0);
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
    <div className="flex-1 flex flex-col overflow-hidden pb-[160px] md:pb-28">
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
          <Users className="w-4 h-4" />
          <span>{members.length}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Main area - Now Playing + Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Now Playing */}
          <div className="p-4 border-b border-border/50">
            {currentSong ? (
              <div className="flex items-center gap-4">
                <img 
                  src={currentSong.image} 
                  alt={currentSong.name}
                  className="w-16 h-16 rounded-xl object-cover shadow-lg"
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
                    <Button variant="ghost" size="icon" onClick={playNext}>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="w-4 h-4 mr-1" /> Search Songs
                  </Button>
                )}
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
        
        {/* Sidebar - Song Requests (desktop) */}
        <div className="hidden md:flex flex-col w-80 border-l border-border/50">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
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
                      <img 
                        src={request.song_data.image} 
                        alt={request.song_data.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{request.song_data.name}</p>
                        <p className="text-xs text-muted-foreground truncate">by {request.requested_by}</p>
                      </div>
                    </div>
                    {isHost && (
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleAcceptRequest(request)}
                        >
                          <Check className="w-3 h-3 mr-1" /> Play
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateRequestStatus(request.id, 'rejected')}
                        >
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
    </div>
  );
}
