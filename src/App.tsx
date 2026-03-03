import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MusicPlayer from "@/components/MusicPlayer";
import DynamicBackground from "@/components/DynamicBackground";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import PlaylistPage from "./pages/PlaylistPage";
import LikedSongsPage from "./pages/LikedSongsPage";
import ArtistPage from "./pages/ArtistPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DynamicBackground />
        <div className="flex h-screen w-screen overflow-hidden relative">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/playlist/:id" element={<PlaylistPage />} />
              <Route path="/liked" element={<LikedSongsPage />} />
              <Route path="/artist/:id" element={<ArtistPage />} />
              <Route path="/library" element={<Index />} />
              <Route path="/trending" element={<Index />} />
              <Route path="/radio" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <MusicPlayer />
          <MobileNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
