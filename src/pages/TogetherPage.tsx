import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Zap, Users, ArrowRight, LogIn, LogOut, Loader2 } from 'lucide-react';
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
  const { currentRoom, pendingJoin, createRoom, leaveRoom, setUserName, requestJoinRoom, joinRoom, clearPendingJoin } = useRoomStore();
  
  const [name, setName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const stored = localStorage.getItem('kanako-user-name');
    if (stored) setName(stored);
  }, []);
  
  // Handle pending join approval/rejection
  useEffect(() => {
    if (!pendingJoin) return;
    if (pendingJoin.status === 'approved') {
      toast.success('Host approved your join request!');
      const storedName = localStorage.getItem('kanako-user-name') || 'Guest';
      if (user) {
        joinRoom(pendingJoin.roomId, user.id, storedName).then((ok) => {
          if (ok) navigate(`/room/${pendingJoin.roomId}`);
        });
      }
    } else if (pendingJoin.status === 'rejected') {
      toast.error('Host denied your join request');
      clearPendingJoin();
      setLoading(false);
    }
  }, [pendingJoin?.status]);
  
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
    const roomId = await createRoom(user.id, name.trim());
    setLoading(false);
    
    if (roomId) {
      navigate(`/room/${roomId}`);
    } else {
      toast.error('Failed to create room');
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
    
    setLoading(true);
    const result = await requestJoinRoom(roomIdInput.trim().toUpperCase(), user.id, name.trim());
    
    if (result === 'not_found') {
      toast.error('Room not found');
      setLoading(false);
    }
    // If 'pending', stay in loading state and wait for approval
  };
  
  const handleLeaveRoom = async () => {
    if (user) {
      await leaveRoom(user.id);
    }
  };
  
  // Show active room card if user is in a room
  if (currentRoom) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-6 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl">
              <Headphones className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold font-display gradient-text mb-2">Active Room</h1>
            <p className="text-muted-foreground">You're currently in a room</p>
          </div>
          
          <div className="p-6 rounded-2xl glass mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-1">{currentRoom.room_name}</h2>
            <p className="text-sm text-muted-foreground font-mono mb-4">{currentRoom.id}</p>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate(`/room/${currentRoom.id}`)}
                className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Rejoin Room
              </Button>
              <Button
                onClick={handleLeaveRoom}
                variant="outline"
                className="flex-1 h-12"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Leave Room
              </Button>
            </div>
          </div>
        </motion.div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    );
  }
  
  // Show waiting state if pending join
  if (pendingJoin && pendingJoin.status === 'pending') {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-6 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl">
            <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
          </div>
          <h1 className="text-2xl font-bold font-display gradient-text mb-2">Waiting for Host</h1>
          <p className="text-muted-foreground mb-6">Your join request has been sent. Waiting for the host to approve...</p>
          <p className="text-sm font-mono text-muted-foreground mb-6">{pendingJoin.roomId}</p>
          <Button variant="outline" onClick={() => { clearPendingJoin(); setLoading(false); }}>
            Cancel
          </Button>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-6 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl">
            <Headphones className="w-10 h-10 text-primary-foreground" />
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
                <p className="font-medium text-foreground">Host Approval</p>
                <p className="text-xs text-muted-foreground">Host approves who can join the room</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
