import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { useFCM } from "@/hooks/useFCM";
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
import { AdminRoute } from "@/components/AdminRoute";
import { BroadcastPopup } from "@/components/BroadcastPopup";
import { HelpTourProvider, useHelpTour } from "@/contexts/HelpTourContext";
import { GlobalTourSystem } from "@/components/tour/TourController";

// Core pages - Basic pages kept static or shifted to lazy depending on usage
const Index = lazy(() => import("./pages/Index"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Auth = lazy(() => import("./pages/Auth"));
const Feed = lazy(() => import("./pages/Feed"));
const Explore = lazy(() => import("./pages/Explore"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const Projects = lazy(() => import("./pages/Projects"));
const AIRoadmap = lazy(() => import("./pages/AIRoadmap"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const TopicPage = lazy(() => import("./pages/TopicPage"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const PostDetails = lazy(() => import("./pages/PostDetails"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Messages = lazy(() => import("./pages/Messages"));
const Chat = lazy(() => import("./pages/Chat"));
const CreateStory = lazy(() => import("./pages/CreateStory"));
const StoryView = lazy(() => import("./pages/StoryView"));
const ProfileViews = lazy(() => import("./pages/ProfileViews"));
const AllPeople = lazy(() => import("./pages/AllPeople"));
const ProjectIdeas = lazy(() => import("./pages/ProjectIdeas"));
const AIEnhancer = lazy(() => import("./pages/AIEnhancer"));
const AIPage = lazy(() => import("./pages/AIPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const SelectAvatar = lazy(() => import("./pages/SelectAvatar"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Ecosystem = lazy(() => import("./pages/Ecosystem"));
const Settings = lazy(() => import("./pages/Settings"));
const LeaderboardFull = lazy(() => import("./pages/LeaderboardFull"));
const HallOfFameFull = lazy(() => import("./pages/HallOfFameFull"));

// Feature pages
const FoundersCorner = lazy(() => import("./pages/FoundersCorner"));
const GigMarketplace = lazy(() => import("./pages/GigMarketplace"));
const ApplicationsDashboard = lazy(() => import("./pages/ApplicationsDashboard"));
const UpcomingFeatures = lazy(() => import("./pages/UpcomingFeatures"));
const TechMatch = lazy(() => import("./pages/TechMatch"));
const GroupChat = lazy(() => import("./pages/GroupChat"));
const Games = lazy(() => import("./pages/Games"));

// Game pages
const DotsAndBoxes = lazy(() => import("./pages/games/DotsAndBoxes"));
const TicTacToe = lazy(() => import("./pages/games/TicTacToe"));
const MemoryMatch = lazy(() => import("./pages/games/MemoryMatch"));
const RockPaperScissors = lazy(() => import("./pages/games/RockPaperScissors"));
const ConnectFour = lazy(() => import("./pages/games/ConnectFour"));
const ReflexMaster = lazy(() => import("./pages/games/ReflexMaster"));
const WordBlitz = lazy(() => import("./pages/games/WordBlitz"));
const NumberMerge = lazy(() => import("./pages/games/NumberMerge"));
const PatternPro = lazy(() => import("./pages/games/PatternPro"));
const SpeedMath = lazy(() => import("./pages/games/SpeedMath"));
const CodeDuel = lazy(() => import("./pages/games/CodeDuel"));

// Admin pages
const AdminLogin = lazy(() => import("./pages/Admin/Login"));
const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/Admin/Users"));
const AdminModeration = lazy(() => import("./pages/Admin/Moderation"));
const AdminAnalytics = lazy(() => import("./pages/Admin/Analytics"));
const AdminFinance = lazy(() => import("./pages/Admin/Finance"));
const AdminSettings = lazy(() => import("./pages/Admin/Settings"));
const AdminReports = lazy(() => import("./pages/Admin/Reports"));
const AdminLogs = lazy(() => import("./pages/Admin/SystemLogs"));
const AdminDatabase = lazy(() => import("./pages/Admin/Database"));
const AdminCoins = lazy(() => import("./pages/Admin/Coins"));
const AdminNotifications = lazy(() => import("./pages/Admin/Notifications"));
const AdminPopups = lazy(() => import("./pages/Admin/Popups"));
const AdminFeedback = lazy(() => import("./pages/Admin/AdminFeedback"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60, // 1 hour
      staleTime: 1000 * 60 * 5, // 5 minutes (keep data fresh but avoid instant refetches)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

const OnboardingAutoStart = () => {
  const { startTour, completedTours, activeTour } = useHelpTour();

  useEffect(() => {
    const isAuth = !!localStorage.getItem('supabase.auth.token') || !!document.cookie.includes('sb-');

    // If user is logged in, not in a tour, and has not completed the 'feed' tour
    if (!activeTour && !completedTours.includes('feed')) {
      // Delay slightly to ensure UI is ready
      const timer = setTimeout(() => {
        // Only start if we are on the feed or home
        if (window.location.pathname === '/feed' || window.location.pathname === '/') {
          startTour('feed', true); // mandatory = true
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [completedTours, activeTour, startTour]);

  return null;
};

const App = () => {
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
            <HelpTourProvider>
              <GlobalErrorBoundary>
                <BrowserRouter>
                  <OnboardingAutoStart />
                  <ScrollToTop />
                  <BroadcastPopup />
                  <GlobalTourSystem />
                  <Suspense fallback={<CartoonLoader />}>
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
                      <Route path="/feedback" element={<FeedbackPage />} />

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
                      <Route path="/admin/login" element={<AdminLogin />} />

                      {/* Admin Protected Routes */}
                      <Route element={<AdminRoute />}>
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
                        <Route path="/admin/feedback" element={
                          <SectionErrorBoundary sectionName="Admin Feedback" fallbackRoute="/admin">
                            <AdminFeedback />
                          </SectionErrorBoundary>
                        } />
                        <Route path="/admin/popups" element={
                          <SectionErrorBoundary sectionName="Admin Popups" fallbackRoute="/admin">
                            <AdminPopups />
                          </SectionErrorBoundary>
                        } />
                      </Route>

                      <Route path="/leaderboard" element={<LeaderboardFull />} />
                      <Route path="/hall-of-fame" element={<HallOfFameFull />} />
                      <Route path="/select-avatar" element={<SelectAvatar />} />

                      <Route path="/wallet" element={<Wallet />} />

                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </GlobalErrorBoundary>
            </HelpTourProvider>
          </UserPresenceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
