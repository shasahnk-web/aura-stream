import { useState, useEffect } from 'react';
import { Users, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import type { Song } from '@/store/playerStore';

interface Activity {
  user_id: string;
  name: string;
  avatar_url: string | null;
  song: Song | null;
}

export default function FriendsActivity() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    const loadActivities = async () => {
      // Get accepted friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      
      if (!friendships || friendships.length === 0) return;
      
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      
      // Get activities and profiles
      const [activityRes, profileRes] = await Promise.all([
        supabase.from('user_activity').select('*').in('user_id', friendIds),
        supabase.from('profiles').select('id, name, avatar_url').in('id', friendIds),
      ]);
      
      const profileMap = new Map(profileRes.data?.map(p => [p.id, p]) || []);
      
      const activityList: Activity[] = (activityRes.data || []).map(a => ({
        user_id: a.user_id,
        name: profileMap.get(a.user_id)?.name || 'Unknown',
        avatar_url: profileMap.get(a.user_id)?.avatar_url || null,
        song: a.song_data as Song | null,
      })).filter(a => a.song);
      
      setActivities(activityList.slice(0, 5));
    };
    
    loadActivities();
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, [user]);
  
  if (!user || activities.length === 0) return null;
  
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Friends Listening
        </h2>
        <button 
          onClick={() => navigate('/friends')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          See all
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
        {activities.map(activity => (
          <div 
            key={activity.user_id}
            className="flex-shrink-0 w-32 p-3 rounded-xl glass text-center"
          >
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
              {activity.avatar_url ? (
                <img src={activity.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-primary">
                  {activity.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground truncate">{activity.name}</p>
            {activity.song && (
              <p className="text-[10px] text-muted-foreground truncate mt-1">
                🎵 {activity.song.name}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
