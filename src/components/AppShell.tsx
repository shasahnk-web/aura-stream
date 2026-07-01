import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import DynamicBackground from '@/components/DynamicBackground';

const Index = lazy(() => import('@/pages/Index'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const PlaylistPage = lazy(() => import('@/pages/PlaylistPage'));
const LikedSongsPage = lazy(() => import('@/pages/LikedSongsPage'));
const ArtistPage = lazy(() => import('@/pages/ArtistPage'));
const TrendingPage = lazy(() => import('@/pages/TrendingPage'));
const RadioPage = lazy(() => import('@/pages/RadioPage'));
const LibraryPage = lazy(() => import('@/pages/LibraryPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const TogetherPage = lazy(() => import('@/pages/TogetherPage'));
const RoomPage = lazy(() => import('@/pages/RoomPage'));
const FriendsPage = lazy(() => import('@/pages/FriendsPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const MusicPlayer = lazy(() => import('@/components/MusicPlayer'));

function ShellLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="glass rounded-full px-5 py-2.5 text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}

function ProtectedLayout() {
  return (
    <>
      <DynamicBackground />
      <div className="flex h-screen w-screen overflow-hidden relative">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Suspense fallback={<ShellLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/playlist/:id" element={<PlaylistPage />} />
                <Route path="/liked" element={<LikedSongsPage />} />
                <Route path="/artist/:id" element={<ArtistPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/radio" element={<RadioPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/together" element={<TogetherPage />} />
                <Route path="/room/:id" element={<RoomPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        <Suspense fallback={null}>
          <MusicPlayer />
        </Suspense>
        <MobileNav />
      </div>
    </>
  );
}

export default function AppShell() {
  return (
    <BrowserRouter>
      <ProtectedLayout />
    </BrowserRouter>
  );
}
