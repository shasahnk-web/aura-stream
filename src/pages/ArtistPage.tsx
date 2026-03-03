import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { spotifyArtist, spotifyArtistTopTracks, spotifyTrackToSong, SpotifyTrack, SpotifyArtist } from '@/services/spotifyApi';
import { usePlayerStore, Song } from '@/store/playerStore';
import SongCard from '@/components/SongCard';
import { Play, Users, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const { setCurrentSong, setQueue } = usePlayerStore();

  const { data: artist, isLoading: artistLoading } = useQuery({
    queryKey: ['spotify-artist', id],
    queryFn: () => spotifyArtist(id!),
    enabled: !!id,
  });

  const { data: topTracks, isLoading: tracksLoading } = useQuery({
    queryKey: ['spotify-artist-top-tracks', id],
    queryFn: async (): Promise<Song[]> => {
      const data = await spotifyArtistTopTracks(id!);
      const tracks: SpotifyTrack[] = data.tracks || [];
      return tracks.filter(t => t.preview_url).map(spotifyTrackToSong);
    },
    enabled: !!id,
  });

  const isLoading = artistLoading || tracksLoading;

  const handlePlayAll = () => {
    if (topTracks && topTracks.length > 0) {
      setQueue(topTracks);
      setCurrentSong(topTracks[0]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-8 pt-6">
        <div className="animate-pulse">
          <div className="flex items-end gap-6 mb-8">
            <div className="w-48 h-48 rounded-xl bg-secondary" />
            <div className="space-y-3 flex-1">
              <div className="h-8 bg-secondary rounded w-1/3" />
              <div className="h-4 bg-secondary rounded w-1/4" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-secondary rounded w-1/2" />
                  <div className="h-2 bg-secondary rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  const artistImage = artist.images?.[0]?.url || '';
  const followers = artist.followers?.total || 0;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28">
      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {artistImage && (
          <img
            src={artistImage}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-6 left-6 md:left-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Artist</p>
            <h1 className="text-4xl md:text-6xl font-bold font-display text-foreground mb-2">{artist.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {followers.toLocaleString()} followers
              </span>
              {artist.genres?.length > 0 && (
                <span className="flex items-center gap-1">
                  <Music2 className="w-4 h-4" />
                  {artist.genres.slice(0, 3).join(', ')}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 md:px-8 pt-6">
        {/* Play All Button */}
        {topTracks && topTracks.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handlePlayAll}
            className="mb-6 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          </motion.button>
        )}

        {/* Top Tracks */}
        {topTracks && topTracks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold font-display text-foreground mb-4">Popular Tracks</h2>
            <div className="glass rounded-xl p-2">
              {topTracks.map((song, i) => (
                <SongCard key={song.id} song={song} songs={topTracks} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Genres */}
        {artist.genres?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold font-display text-foreground mb-4">Genres</h2>
            <div className="flex flex-wrap gap-2">
              {artist.genres.map((genre: string) => (
                <span
                  key={genre}
                  className="px-3 py-1.5 rounded-full glass text-xs font-medium text-foreground capitalize"
                >
                  {genre}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
