import { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Check, X, Music, MessageCircle, ArrowLeft, Send, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import AuthModal from '@/components/AuthModal';
import { toast } from 'sonner';
import type { Song } from '@/store/playerStore';

interface Friend {
  id: string;
  name: string;
  avatar_url: string | null;
  status: 'pending' | 'accepted';
  isRequester: boolean;
}

interface FriendActivity {
  user_id: string;
  song_data: Song | null;
  action: string;
  updated_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

type ViewMode = 'list' | 'profile' | 'chat';

export default function FriendsPage() {
  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // DM & Profile state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (user) {
      loadFriends();
      loadActivities();
    }
  }, [user]);

  // Subscribe to new DMs
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('dm-updates')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const newMsg = payload.new as DirectMessage;
        if (selectedFriend && newMsg.sender_id === selectedFriend.id) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedFriend]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const loadFriends = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (!data) return;
    
    const friendIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', friendIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const friendList: Friend[] = data.map(f => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const profile = profileMap.get(friendId);
      return {
        id: friendId,
        name: profile?.name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        status: f.status as 'pending' | 'accepted',
        isRequester: f.requester_id === user.id,
      };
    });
    
    setFriends(friendList);
  };
  
  const loadActivities = async () => {
    if (!user) return;
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    
    if (!friendships || friendships.length === 0) return;
    
    const friendIds = friendships.map(f => 
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    
    const { data: activityData } = await supabase
      .from('user_activity')
      .select('*')
      .in('user_id', friendIds)
      .order('updated_at', { ascending: false });
    
    if (!activityData) return;
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', friendIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    setActivities(activityData.map(a => ({
      ...a,
      song_data: a.song_data as unknown as Song | null,
      profile: profileMap.get(a.user_id),
    })));
  };
  
  const handleAddFriend = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (!emailInput.trim()) { toast.error('Please enter an email'); return; }
    
    setLoading(true);
    
    // Use the secure RPC function instead of direct profile query
    const { data: results, error } = await supabase.rpc('find_user_by_email', { search_email: emailInput.trim() });
    const targetUser = results?.[0];
    
    if (!targetUser) {
      toast.error('User not found. They may need to create an account first.');
      setLoading(false);
      return;
    }
    
    if (targetUser.id === user.id) {
      toast.error("You can't add yourself");
      setLoading(false);
      return;
    }
    
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${user.id})`)
      .single();
    
    if (existing) {
      toast.error('Friend request already exists');
      setLoading(false);
      return;
    }
    
    const { error: insertError } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: targetUser.id,
    });
    
    if (insertError) {
      toast.error('Failed to send request');
    } else {
      toast.success('Friend request sent!');
      setEmailInput('');
      loadFriends();
    }
    
    setLoading(false);
  };
  
  const handleAccept = async (friendId: string) => {
    if (!user) return;
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', friendId)
      .eq('addressee_id', user.id);
    
    toast.success('Friend request accepted!');
    loadFriends();
    loadActivities();
  };
  
  const handleReject = async (friendId: string) => {
    if (!user) return;
    await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`);
    
    toast.success('Removed');
    loadFriends();
  };

  const openProfile = (friend: Friend) => {
    setSelectedFriend(friend);
    setViewMode('profile');
  };

  const openChat = async (friend: Friend) => {
    setSelectedFriend(friend);
    setViewMode('chat');
    if (!user) return;
    
    // Load conversation
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100);
    
    setMessages((data || []) as DirectMessage[]);

    // Mark unread messages as read
    await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('sender_id', friend.id)
      .eq('receiver_id', user.id)
      .eq('read', false);
  };

  const sendDM = async () => {
    if (!user || !selectedFriend || !chatInput.trim()) return;
    
    const { data, error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: selectedFriend.id,
      message: chatInput.trim(),
    }).select().single();
    
    if (error) {
      toast.error('Failed to send message');
      return;
    }
    
    setMessages(prev => [...prev, data as DirectMessage]);
    setChatInput('');
  };
  
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to see friends</h2>
        <Button onClick={() => setAuthOpen(true)}>Sign In</Button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    );
  }

  // Friend Profile View
  if (viewMode === 'profile' && selectedFriend) {
    const activity = activities.find(a => a.user_id === selectedFriend.id);
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-6 pt-5">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {selectedFriend.avatar_url ? (
                <img src={selectedFriend.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {selectedFriend.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground">{selectedFriend.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">Friend</p>
          </div>

          {/* Currently Listening */}
          {activity?.song_data && (
            <div className="p-4 rounded-xl glass mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Currently Listening</h3>
              <div className="flex items-center gap-3">
                <img src={activity.song_data.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{activity.song_data.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.song_data.artist}</p>
                </div>
                <Music className="w-5 h-5 text-primary animate-pulse" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full h-12" onClick={() => openChat(selectedFriend)}>
              <MessageCircle className="w-5 h-5 mr-2" /> Send Message
            </Button>
            <Button variant="destructive" className="w-full h-12" onClick={() => { handleReject(selectedFriend.id); setViewMode('list'); }}>
              <X className="w-5 h-5 mr-2" /> Remove Friend
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // DM Chat View
  if (viewMode === 'chat' && selectedFriend) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden pb-[160px] md:pb-28">
        {/* Chat Header */}
        <div className="glass border-b border-border/50 px-4 py-3 flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {selectedFriend.avatar_url ? (
              <img src={selectedFriend.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-primary">
                {selectedFriend.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h2 className="font-semibold text-foreground">{selectedFriend.name}</h2>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">
                No messages yet. Say hi! 👋
              </p>
            )}
            {messages.map((msg) => {
              const isMine = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    isMine 
                      ? 'bg-primary text-primary-foreground rounded-br-md' 
                      : 'glass rounded-bl-md text-foreground'
                  }`}>
                    {msg.message}
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
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
              onKeyDown={(e) => e.key === 'Enter' && sendDM()}
              className="flex-1 bg-secondary/50"
            />
            <Button onClick={sendDM} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const pendingRequests = friends.filter(f => f.status === 'pending' && !f.isRequester);
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  
  // Main Friends List
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-6 pt-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        <h1 className="text-2xl font-bold font-display text-foreground mb-6">Friends</h1>
        
        {/* Add Friend */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">Add Friend by Email</label>
          <div className="flex gap-2">
            <Input
              placeholder="friend@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
              className="flex-1 bg-secondary/50"
            />
            <Button onClick={handleAddFriend} disabled={loading}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Friend Requests
            </h3>
            <div className="space-y-2">
              {pendingRequests.map(friend => (
                <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl glass">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {friend.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{friend.name}</p>
                    <p className="text-xs text-muted-foreground">Wants to be friends</p>
                  </div>
                  <Button size="sm" onClick={() => handleAccept(friend.id)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(friend.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Friends Activity */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Friends Listening
          </h3>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity yet. Add friends to see what they're listening to!
            </p>
          ) : (
            <div className="space-y-2">
              {activities.map(activity => {
                const friend = acceptedFriends.find(f => f.id === activity.user_id);
                return (
                  <div
                    key={activity.user_id}
                    className="flex items-center gap-3 p-3 rounded-xl glass cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => friend && openProfile(friend)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {activity.profile?.avatar_url ? (
                        <img src={activity.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          {activity.profile?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{activity.profile?.name}</p>
                      {activity.song_data ? (
                        <p className="text-xs text-muted-foreground truncate">
                          🎵 {activity.song_data.name} - {activity.song_data.artist}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not playing</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* All Friends */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            All Friends ({acceptedFriends.length})
          </h3>
          {acceptedFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No friends yet. Add someone using their email!
            </p>
          ) : (
            <div className="space-y-2">
              {acceptedFriends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 rounded-xl glass cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => openProfile(friend)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {friend.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{friend.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openChat(friend); }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
      
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
