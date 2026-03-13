import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MusicPlayer from "@/components/MusicPlayer";
import DynamicBackground from "@/components/DynamicBackground";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import PlaylistPage from "./pages/PlaylistPage";
import LikedSongsPage from "./pages/LikedSongsPage";
import ArtistPage from "./pages/ArtistPage";
import TrendingPage from "./pages/TrendingPage";
import RadioPage from "./pages/RadioPage";
import LibraryPage from "./pages/LibraryPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import TogetherPage from "./pages/TogetherPage";
import RoomPage from "./pages/RoomPage";
import FriendsPage from "./pages/FriendsPage";
import NotFound from "./pages/NotFound";
import { useAuthStore } from "@/store/authStore";

const queryClient = new QueryClient();

function AuthInit() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthInit />
        <DynamicBackground />
        <div className="flex h-screen w-screen overflow-hidden relative">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header />
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-32 md:pb-20">
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
            </main>
          </div>
          <MusicPlayer />
          <MobileNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
