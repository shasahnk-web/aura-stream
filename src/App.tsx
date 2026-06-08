import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import AppShell from "@/components/AppShell";

const queryClient = new QueryClient();

function AuthInit() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, [init]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthInit />
      <AppShell />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
