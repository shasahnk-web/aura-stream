import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Zap, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';
import AuthModal from '@/components/AuthModal';
import { toast } from 'sonner';

export default function TogetherPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createRoom, joinRoom, setUserName } = useRoomStore();
  
  const [name, setName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kanako-user-name');
      if (stored) setName(stored);
    } catch {
      // localStorage may not be available in some browsers/private modes
    }
  }, []);
  
  const handleNameChange = (value: string) => {
    setName(value);
    localStorage.setItem('kanako-user-name', value);
    setUserName(value);
  };
  
  const handleCreateRoom = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    
    if (!name.trim()) {
      toast.error('Please enter your name first');
      return;
    }
    
    setLoading(true);
    const result = await createRoom(user.id, name.trim());
    setLoading(false);

    if (result?.id) {
      navigate(`/room/${result.id}`);
    } else {
      toast.error(result?.error || 'Failed to create room');
    }
  };
  
  const handleJoinRoom = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    
    if (!name.trim()) {
      toast.error('Please enter your name first');
      return;
    }
    
    if (!roomIdInput.trim()) {
      toast.error('Please enter a room ID');
      return;
    }
    
    // Validate room ID format
    const normalizedRoomId = roomIdInput.trim().toUpperCase();
    if (!/^ROOM-\d{4}$/.test(normalizedRoomId)) {
      toast.error('Invalid room ID format. Use format: ROOM-1234');
      return;
    }
    
    setLoading(true);
    const result = await joinRoom(normalizedRoomId, user.id, name.trim());
    setLoading(false);
    
    if (result.success) {
      navigate(`/room/${normalizedRoomId}`);
    } else {
      toast.error(result.error || 'Room not found or unable to join');
    }
  };
  
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-52 md:pb-44 px-4 md:px-6 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center relative">
            {/* Gradient glow */}
            <div className="absolute inset-0 opacity-50" style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(0,255,200,0.4), transparent)',
            }} />
            {/* Headphones icon */}
            <div className="relative z-10 text-5xl animate-bounce">🎧</div>
            {/* Love hearts */}
            <div className="absolute top-2 left-2 text-xl opacity-75 animate-pulse">💕</div>
            <div className="absolute bottom-2 right-2 text-xl opacity-75 animate-pulse" style={{ animationDelay: '0.3s' }}>💕</div>
          </div>
          <h1 className="text-3xl font-bold font-display gradient-text mb-2">Listen Together</h1>
          <p className="text-muted-foreground">Real-time music with friends</p>
        </div>
        
        {/* Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">Your Name</label>
          <Input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="h-12 text-lg bg-secondary/50 border-border/50"
          />
        </div>
        
        {/* Create Room */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mb-4"
        >
          <Button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg"
          >
            <Zap className="w-5 h-5 mr-2" />
            Create Room
          </Button>
        </motion.div>
        
        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-sm text-muted-foreground">or join existing</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>
        
        {/* Join Room */}
        <div className="flex gap-2">
          <Input
            placeholder="Room ID (e.g., ROOM-4582)"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
            className="h-12 flex-1 bg-secondary/50 border-border/50 font-mono"
          />
          <Button
            onClick={handleJoinRoom}
            disabled={loading}
            variant="outline"
            className="h-12 px-6"
          >
            Join <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        {/* Features */}
        <div className="mt-10 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Features</h3>
          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl glass">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Synced Playback</p>
                <p className="text-xs text-muted-foreground">Everyone hears the same music in real-time</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl glass">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Live Chat</p>
                <p className="text-xs text-muted-foreground">Chat with friends while listening</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl glass">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Song Requests</p>
                <p className="text-xs text-muted-foreground">Request songs for the host to play</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
