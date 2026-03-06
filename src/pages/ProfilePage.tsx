import { User, Settings, Moon, Headphones, LogOut, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLikedStore } from '@/store/playerStore';

export default function ProfilePage() {
  const { likedSongs } = useLikedStore();

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 px-4 md:px-6 pt-5">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div
          className="w-[120px] h-[120px] rounded-full mx-auto mb-4 overflow-hidden border-[3px] border-border/50 shadow-lg"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-12 h-12 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-[22px] font-semibold text-foreground mb-1">KanaKo User</h2>
        <p className="text-sm text-muted-foreground">kanako@trms.dev</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-5 flex justify-between mb-8"
      >
        <div className="text-center flex-1">
          <p className="text-xl font-semibold gradient-text">1,245</p>
          <p className="text-[13px] text-muted-foreground">Minutes</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xl font-semibold gradient-text">{likedSongs.length}</p>
          <p className="text-[13px] text-muted-foreground">Songs</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xl font-semibold gradient-text">24</p>
          <p className="text-[13px] text-muted-foreground">Playlists</p>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 mb-5"
      >
        <button className="w-full p-4 glass rounded-xl text-foreground text-[15px] font-medium flex items-center justify-between hover:bg-white/10 transition-all hover:translate-x-1">
          <span className="flex items-center gap-3">
            <User className="w-[18px] h-[18px]" /> Edit Profile
          </span>
          <ChevronRight className="w-[18px] h-[18px] text-muted-foreground" />
        </button>
        <button className="w-full p-4 glass rounded-xl text-foreground text-[15px] font-medium flex items-center justify-between hover:bg-white/10 transition-all hover:translate-x-1">
          <span className="flex items-center gap-3">
            <Settings className="w-[18px] h-[18px]" /> Settings
          </span>
          <ChevronRight className="w-[18px] h-[18px] text-muted-foreground" />
        </button>
        <button className="w-full p-4 glass rounded-xl text-foreground text-[15px] font-medium flex items-center justify-between hover:bg-white/10 transition-all hover:translate-x-1">
          <span className="flex items-center gap-3">
            <Moon className="w-[18px] h-[18px]" /> Dark Mode
          </span>
          <div className="w-[50px] h-[24px] rounded-full bg-primary relative">
            <div className="absolute right-1 top-1 w-4 h-4 bg-foreground rounded-full" />
          </div>
        </button>
        <button className="w-full p-4 glass rounded-xl text-foreground text-[15px] font-medium flex items-center justify-between hover:bg-white/10 transition-all hover:translate-x-1">
          <span className="flex items-center gap-3">
            <Headphones className="w-[18px] h-[18px]" /> Audio Quality
          </span>
          <ChevronRight className="w-[18px] h-[18px] text-muted-foreground" />
        </button>
        <button
          className="w-full p-4 rounded-xl text-foreground text-[15px] font-medium flex items-center justify-between transition-all hover:translate-x-1"
          style={{ background: 'linear-gradient(to right, hsl(350 100% 71%), hsl(0 84% 60%))', boxShadow: '0 4px 15px hsl(350 100% 71% / 0.3)' }}
        >
          <span className="flex items-center gap-3">
            <LogOut className="w-[18px] h-[18px]" /> Logout
          </span>
          <ChevronRight className="w-[18px] h-[18px]" />
        </button>
      </motion.div>
    </div>
  );
}
