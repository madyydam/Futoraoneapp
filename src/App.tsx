import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useFCM } from "@/hooks/useFCM";

import { ThemeProvider } from "@/components/theme-provider";
import ScrollToTop from "@/components/ScrollToTop";
import { CartoonLoader } from "@/components/CartoonLoader";
import { AchievementListener } from "@/components/AchievementListener";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { UserPresenceProvider } from "@/contexts/UserPresenceContext";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

// Core pages - Eager loaded for speed
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
// import Profile from "./pages/Profile"; // Removed static import to use lazy loading

// Lazy load other pages
const Explore = lazy(() => import("./pages/Explore"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile")); // Restore lazy profile
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
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AIPage = lazy(() => import("./pages/AIPage"));
const Messages = lazy(() => import("./pages/Messages"));
const Chat = lazy(() => import("./pages/Chat"));
const CreateStory = lazy(() => import("./pages/CreateStory"));
const StoryView = lazy(() => import("./pages/StoryView"));
const ProfileViews = lazy(() => import("./pages/ProfileViews"));
const AllPeople = lazy(() => import("./pages/AllPeople"));
const ProjectIdeas = lazy(() => import("./pages/ProjectIdeas"));
const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/Admin/Users"));
const AdminModeration = lazy(() => import("./pages/Admin/Moderation"));
const AdminAnalytics = lazy(() => import("./pages/Admin/Analytics"));
const AdminFinance = lazy(() => import("./pages/Admin/Finance"));
const AdminSettings = lazy(() => import("./pages/Admin/Settings"));
const AIEnhancer = lazy(() => import("./pages/AIEnhancer"));

const FoundersCorner = lazy(() => import("./pages/FoundersCorner"));
const GigMarketplace = lazy(() => import("./pages/GigMarketplace"));
const ApplicationsDashboard = lazy(() => import("./pages/ApplicationsDashboard"));
const UpcomingFeatures = lazy(() => import("./pages/UpcomingFeatures"));
const TechMatch = lazy(() => import("./pages/TechMatch"));

const GroupChat = lazy(() => import("./pages/GroupChat"));

const Games = lazy(() => import("./pages/Games"));
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
const Settings = lazy(() => import("./pages/Settings"));
const LeaderboardFull = lazy(() => import("./pages/LeaderboardFull"));
const HallOfFameFull = lazy(() => import("./pages/HallOfFameFull"));
const SelectAvatar = lazy(() => import("./pages/SelectAvatar"));
const CodeDuel = lazy(() => import("./pages/games/CodeDuel"));
const WalletConnect = lazy(() => import("./pages/WalletRedirect"));

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
  // Note: We'll initialize FCM when user logs in via the auth flow


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
          <OfflineIndicator />
          <AchievementListener />
          <UserPresenceProvider>
            <GlobalErrorBoundary>
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<CartoonLoader />}>
                  <Routes>
                    <Route path="/" element={<Welcome />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/feed" element={<Feed />} />
                    <Route path="/create-post" element={<CreatePost />} />
                    <Route path="/explore" element={<Explore />} />
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

                    <Route path="/leaderboard" element={<LeaderboardFull />} />
                    <Route path="/hall-of-fame" element={<HallOfFameFull />} />
                    <Route path="/select-avatar" element={<SelectAvatar />} />
                    <Route path="/wallet-connect" element={<WalletConnect />} />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </GlobalErrorBoundary>
          </UserPresenceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
