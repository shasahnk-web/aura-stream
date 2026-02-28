import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlaylistCardProps {
  id: string;
  name: string;
  image: string;
  subtitle?: string;
  index?: number;
}

export default function PlaylistCard({ id, name, image, subtitle, index = 0 }: PlaylistCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/playlist/${id}`)}
      className="group cursor-pointer"
    >
      <div className="relative rounded-xl overflow-hidden glass p-3 hover:bg-secondary/30 transition-all duration-300">
        <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.button
            initial={false}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
          >
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          </motion.button>
        </div>
        <h3 className="text-sm font-semibold text-foreground truncate">{name}</h3>
        {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
