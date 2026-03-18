import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useLikedStore } from '@/store/playerStore';
import { User, Mail, Camera, LogOut, Music, Heart, Clock, Edit3, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const { likedSongs } = useLikedStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({ name: '', email: '', avatar_url: '' });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile({ name: data.name, email: data.email || '', avatar_url: data.avatar_url || '' });
        setEditName(data.name);
        setEditEmail(data.email || '');
      }
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Max 2MB');

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { setUploading(false); return toast.error('Upload failed'); }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', user.id);
    setProfile(p => ({ ...p, avatar_url: url }));
    setUploading(false);
    toast.success('Avatar updated!');
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmedName = editName.trim().slice(0, 100);
    if (!trimmedName) return toast.error('Name is required');

    await supabase.from('profiles').update({
      name: trimmedName,
      email: editEmail.trim().slice(0, 255),
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    setProfile(p => ({ ...p, name: trimmedName, email: editEmail.trim() }));
    setEditing(false);
    toast.success('Profile saved!');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    toast.success('Logged out');
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center glass rounded-2xl p-8 max-w-sm w-full">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Login Required</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign in to access your profile and sync data across devices.</p>
        </div>
      </div>
    );
  }

  const stats = [
    { icon: Heart, label: 'Liked Songs', value: likedSongs.length.toString(), color: 'hsl(350, 100%, 71%)' },
    { icon: Music, label: 'Playlists', value: '0', color: 'hsl(270, 76%, 53%)' },
    { icon: Clock, label: 'Hours Played', value: '—', color: 'hsl(200, 80%, 60%)' },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28">
      {/* Hero section */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-primary)', opacity: 0.6 }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="px-4 md:px-6 -mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          {/* Avatar */}
          <div className="relative group mb-4">
            <div
              className="w-28 h-28 rounded-full overflow-hidden border-4 border-background shadow-xl flex items-center justify-center text-5xl"
              style={{ boxShadow: '0 0 30px hsl(270 76% 53% / 0.3)' }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  👤
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground shadow-lg transition-all hover:scale-110"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>

          {/* Name & Email */}
          {!editing ? (
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
              {profile.email && <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>}
              <button
                onClick={() => setEditing(true)}
                className="mt-3 px-5 py-2 rounded-xl text-xs font-semibold text-primary-foreground flex items-center gap-2 mx-auto hover:opacity-90 transition-opacity"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm glass rounded-2xl p-5 mb-6"
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                  <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={100}
                      className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                  <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      maxLength={255}
                      className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ background: 'var(--gradient-primary)' }}
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium glass text-muted-foreground hover:text-foreground transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 text-center"
              >
                <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="w-full max-w-sm space-y-2 mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">Account</h3>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 glass rounded-xl px-4 py-3.5 text-left hover:bg-destructive/10 transition-all group"
            >
              <LogOut className="w-5 h-5 text-destructive group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-sm font-medium text-foreground">Log Out</p>
                <p className="text-[11px] text-muted-foreground">Sign out of your account</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
