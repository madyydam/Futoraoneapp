import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useFCM } from "@/hooks/useFCM";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

import { ThemeProvider } from "@/components/theme-provider";
import ScrollToTop from "@/components/ScrollToTop";
import { CartoonLoader } from "@/components/CartoonLoader";
import { AchievementListener } from "@/components/AchievementListener";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UserPresenceProvider } from "@/contexts/UserPresenceContext";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

// Core pages - Static imports for speed
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import CreatePost from "./pages/CreatePost";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Projects from "./pages/Projects";
import AIRoadmap from "./pages/AIRoadmap";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import CategoryPage from "./pages/CategoryPage";
import TopicPage from "./pages/TopicPage";
import ProjectDetails from "./pages/ProjectDetails";
import PostDetails from "./pages/PostDetails";
import SearchResults from "./pages/SearchResults";
import UserProfile from "./pages/UserProfile";
import ChatPage from "./pages/ChatPage";
import AIPage from "./pages/AIPage";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import CreateStory from "./pages/CreateStory";
import StoryView from "./pages/StoryView";
import ProfileViews from "./pages/ProfileViews";
import AllPeople from "./pages/AllPeople";
import ProjectIdeas from "./pages/ProjectIdeas";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminUsers from "./pages/Admin/Users";
import AdminModeration from "./pages/Admin/Moderation";
import AdminAnalytics from "./pages/Admin/Analytics";
import AdminFinance from "./pages/Admin/Finance";
import AdminSettings from "./pages/Admin/Settings";
import AdminReports from "./pages/Admin/Reports";
import AdminLogs from "./pages/Admin/SystemLogs";
import AdminDatabase from "./pages/Admin/Database";
import AdminCoins from "./pages/Admin/Coins";
import AdminNotifications from "./pages/Admin/Notifications";


import AIEnhancer from "./pages/AIEnhancer";
import FoundersCorner from "./pages/FoundersCorner";
import GigMarketplace from "./pages/GigMarketplace";
import ApplicationsDashboard from "./pages/ApplicationsDashboard";
import UpcomingFeatures from "./pages/UpcomingFeatures";
import TechMatch from "./pages/TechMatch";
import GroupChat from "./pages/GroupChat";
import Games from "./pages/Games";
import DotsAndBoxes from "./pages/games/DotsAndBoxes";
import TicTacToe from "./pages/games/TicTacToe";
import MemoryMatch from "./pages/games/MemoryMatch";
import RockPaperScissors from "./pages/games/RockPaperScissors";
import ConnectFour from "./pages/games/ConnectFour";
import ReflexMaster from "./pages/games/ReflexMaster";
import WordBlitz from "./pages/games/WordBlitz";
import NumberMerge from "./pages/games/NumberMerge";
import PatternPro from "./pages/games/PatternPro";
import SpeedMath from "./pages/games/SpeedMath";
import Settings from "./pages/Settings";
import LeaderboardFull from "./pages/LeaderboardFull";
import HallOfFameFull from "./pages/HallOfFameFull";
import SelectAvatar from "./pages/SelectAvatar";
import CodeDuel from "./pages/games/CodeDuel";
import WalletConnect from "./pages/WalletRedirect";
import Wallet from "./pages/Wallet";
import Ecosystem from "./pages/Ecosystem";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60, // 1 hour
      staleTime: 1000 * 60 * 5, // 5 minutes (keep data fresh but avoid instant refetches)
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useFCM(user);


  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <AchievementListener />
          <UserPresenceProvider>
            <GlobalErrorBoundary>
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Welcome />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/create-post" element={<CreatePost />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/ecosystem" element={<Ecosystem />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/user/:userId" element={<UserProfile />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/ai-roadmap" element={<AIRoadmap />} />
                  <Route path="/ai-tools" element={<AIPage />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/category/:category" element={<CategoryPage />} />
                  <Route path="/topic/:topic" element={<TopicPage />} />
                  <Route path="/project/:projectId" element={<ProjectDetails />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/people" element={<AllPeople />} />
                  <Route path="/chat/:conversationId" element={<Chat />} />
                  <Route path="/create-story" element={<CreateStory />} />
                  <Route path="/story/:userId" element={<StoryView />} />
                  <Route path="/profile-views" element={<ProfileViews />} />
                  <Route path="/project-ideas" element={<ProjectIdeas />} />
                  <Route path="/ai-enhancer" element={<AIEnhancer />} />

                  {/* Feature sections with error boundaries */}
                  <Route path="/founders-corner" element={
                    <SectionErrorBoundary sectionName="Founders Corner" fallbackRoute="/feed">
                      <FoundersCorner />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/gig-marketplace" element={
                    <SectionErrorBoundary sectionName="Gig Marketplace" fallbackRoute="/feed">
                      <GigMarketplace />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/applications" element={
                    <SectionErrorBoundary sectionName="Applications" fallbackRoute="/feed">
                      <ApplicationsDashboard />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/upcoming-features" element={
                    <SectionErrorBoundary sectionName="Upcoming Features" fallbackRoute="/feed">
                      <UpcomingFeatures />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/tech-match" element={
                    <SectionErrorBoundary sectionName="Tech Match" fallbackRoute="/feed">
                      <TechMatch />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/messages/group/:groupId" element={
                    <SectionErrorBoundary sectionName="Group Chat" fallbackRoute="/messages">
                      <GroupChat />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/post/:postId" element={<PostDetails />} />

                  {/* Games with error boundaries */}
                  <Route path="/games" element={<Games />} />
                  <Route path="/games/dots-and-boxes" element={
                    <SectionErrorBoundary sectionName="Dots and Boxes" fallbackRoute="/games">
                      <DotsAndBoxes />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/tic-tac-toe" element={
                    <SectionErrorBoundary sectionName="Tic Tac Toe" fallbackRoute="/games">
                      <TicTacToe />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/memory-match" element={
                    <SectionErrorBoundary sectionName="Memory Match" fallbackRoute="/games">
                      <MemoryMatch />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/rock-paper-scissors" element={
                    <SectionErrorBoundary sectionName="Rock Paper Scissors" fallbackRoute="/games">
                      <RockPaperScissors />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/connect-four" element={
                    <SectionErrorBoundary sectionName="Connect Four" fallbackRoute="/games">
                      <ConnectFour />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/reflex-master" element={
                    <SectionErrorBoundary sectionName="Reflex Master" fallbackRoute="/games">
                      <ReflexMaster />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/word-blitz" element={
                    <SectionErrorBoundary sectionName="Word Blitz" fallbackRoute="/games">
                      <WordBlitz />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/number-merge" element={
                    <SectionErrorBoundary sectionName="Number Merge" fallbackRoute="/games">
                      <NumberMerge />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/pattern-pro" element={
                    <SectionErrorBoundary sectionName="Pattern Pro" fallbackRoute="/games">
                      <PatternPro />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/speed-math" element={
                    <SectionErrorBoundary sectionName="Speed Math" fallbackRoute="/games">
                      <SpeedMath />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/games/code-duel" element={
                    <SectionErrorBoundary sectionName="Code Duel" fallbackRoute="/games">
                      <CodeDuel />
                    </SectionErrorBoundary>
                  } />

                  {/* Admin sections with error boundaries */}
                  <Route path="/admin" element={
                    <SectionErrorBoundary sectionName="Admin Dashboard" fallbackRoute="/feed">
                      <AdminDashboard />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/users" element={
                    <SectionErrorBoundary sectionName="Admin Users" fallbackRoute="/admin">
                      <AdminUsers />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/coins" element={
                    <SectionErrorBoundary sectionName="Admin Coins" fallbackRoute="/admin">
                      <AdminCoins />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/notifications" element={
                    <SectionErrorBoundary sectionName="Admin Notifications" fallbackRoute="/admin">
                      <AdminNotifications />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/moderation" element={
                    <SectionErrorBoundary sectionName="Admin Moderation" fallbackRoute="/admin">
                      <AdminModeration />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/analytics" element={
                    <SectionErrorBoundary sectionName="Admin Analytics" fallbackRoute="/admin">
                      <AdminAnalytics />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/finance" element={
                    <SectionErrorBoundary sectionName="Admin Finance" fallbackRoute="/admin">
                      <AdminFinance />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/settings" element={
                    <SectionErrorBoundary sectionName="Admin Settings" fallbackRoute="/admin">
                      <AdminSettings />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/reports" element={
                    <SectionErrorBoundary sectionName="Admin Reports" fallbackRoute="/admin">
                      <AdminReports />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/logs" element={
                    <SectionErrorBoundary sectionName="Admin Logs" fallbackRoute="/admin">
                      <AdminLogs />
                    </SectionErrorBoundary>
                  } />
                  <Route path="/admin/database" element={
                    <SectionErrorBoundary sectionName="Admin Database" fallbackRoute="/admin">
                      <AdminDatabase />
                    </SectionErrorBoundary>
                  } />

                  <Route path="/leaderboard" element={<LeaderboardFull />} />
                  <Route path="/hall-of-fame" element={<HallOfFameFull />} />
                  <Route path="/select-avatar" element={<SelectAvatar />} />
                  <Route path="/wallet-connect" element={<WalletConnect />} />
                  <Route path="/wallet" element={<Wallet />} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </GlobalErrorBoundary>
          </UserPresenceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
