import { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, Music } from 'lucide-react';
import { motion } from 'framer-motion';
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

export default function FriendsPage() {
  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (user) {
      loadFriends();
      loadActivities();
    }
  }, [user]);
  
  const loadFriends = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    
    if (!data) return;
    
    // Get friend profiles
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
    
    // Get accepted friend IDs
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
    
    // Get profiles for activities
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', friendIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    setActivities(activityData.map(a => ({
      ...a,
      song_data: a.song_data as Song | null,
      profile: profileMap.get(a.user_id),
    })));
  };
  
  const handleAddFriend = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    
    if (!emailInput.trim()) {
      toast.error('Please enter an email');
      return;
    }
    
    setLoading(true);
    
    // Find user by email
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailInput.trim().toLowerCase())
      .single();
    
    if (!targetUser) {
      toast.error('User not found');
      setLoading(false);
      return;
    }
    
    if (targetUser.id === user.id) {
      toast.error("You can't add yourself");
      setLoading(false);
      return;
    }
    
    // Check if already friends
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
    
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: targetUser.id,
    });
    
    if (error) {
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
  
  const pendingRequests = friends.filter(f => f.status === 'pending' && !f.isRequester);
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  
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
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
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
              {activities.map(activity => (
                <div key={activity.user_id} className="flex items-center gap-3 p-3 rounded-xl glass">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    {activity.profile?.avatar_url ? (
                      <img src={activity.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
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
                </div>
              ))}
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
                <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl glass">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {friend.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{friend.name}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleReject(friend.id)}>
                    <X className="w-4 h-4" />
                  </Button>
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
