import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import {
  ExploreHeader,
  OpportunitySection,
  UserGrid,
  CategoryGrid,
  TrendingSection,
  UserProfile
} from "@/components/explore/ExploreComponents";
import type { User } from "@supabase/supabase-js";

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Move callbacks before useEffect to satisfy linter and modify dependency arrays
  const fetchCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }, []);

  const fetchPeople = useCallback(async () => {
    setLoadingPeople(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .neq("id", user?.id || "")
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;

      // Optimize: Parallel fetch is good, keeping it.
      const usersWithCounts = await Promise.all(
        (data || []).map(async (profile) => {
          const { count } = await supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", profile.id);

          return {
            ...profile,
            is_verified: profile.is_verified,
            follower_count: count || 0,
          };
        })
      );

      setPeople(usersWithCounts);
    } catch (error) {
      console.error("Error fetching people:", error);
    } finally {
      setLoadingPeople(false);
    }
  }, []);

  const performSearch = useCallback(async (query: string) => {
    setSearchLoading(true);
    setShowResults(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(5);

      if (!error && data) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchPeople();

    console.log("Setting up real-time profile sync for Explore...");
    const channel = supabase
      .channel('explore-profile-sync')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all profile changes
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log("Real-time profile update received in Explore:", payload);
          // Use unknown then intersection for cleaner casting
          const updatedProfile = payload.new as unknown as (UserProfile & { [key: string]: unknown });

          if (!updatedProfile || !updatedProfile.id) return;

          // Helper to update specific profile in a list
          const updateList = (list: UserProfile[]) => {
            return list.map(p => {
              if (p.id === updatedProfile.id) {
                return {
                  ...p,
                  username: updatedProfile.username || p.username,
                  full_name: updatedProfile.full_name || p.full_name,
                  avatar_url: updatedProfile.avatar_url || p.avatar_url,
                  is_verified: updatedProfile.is_verified !== undefined ? updatedProfile.is_verified : p.is_verified
                };
              }
              return p;
            });
          };

          setPeople(currentPeople => updateList(currentPeople));
          setSearchResults(currentResults => updateList(currentResults));
        }
      )
      .subscribe((status) => {
        console.log(`Explore real-time subscription status: ${status}`);
      });

    return () => {
      console.log("Cleaning up Explore real-time profile sync...");
      supabase.removeChannel(channel);
    };
  }, [fetchCurrentUser, fetchPeople]);

  const handleCategoryClick = useCallback((categoryName: string) => {
    toast({
      title: `Exploring ${categoryName}`,
      description: `Showing posts and projects related to ${categoryName}`,
    });
    navigate(`/category/${encodeURIComponent(categoryName)}`);
  }, [navigate, toast]);

  const handleTopicClick = useCallback((tag: string) => {
    toast({
      title: `#${tag}`,
      description: `Viewing all posts with #${tag}`,
    });
    navigate(`/topic/${encodeURIComponent(tag)}`);
  }, [navigate, toast]);

  const handleProjectClick = useCallback((projectTitle: string) => {
    toast({
      title: projectTitle,
      description: "Opening project details...",
    });
    navigate(`/project/${encodeURIComponent(projectTitle)}`);
  }, [navigate, toast]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowResults(false);
      toast({
        title: "Searching...",
        description: `Looking for "${searchQuery}"`,
      });
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }, [searchQuery, navigate, toast]);

  const handleUserClick = useCallback((userId: string) => {
    setShowResults(false);
    setSearchQuery("");
    navigate(`/user/${userId}`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background pb-20">
      <SEO
        title="Explore"
        description="Discover top developers, trending projects, and exciting opportunities on Futora."
      />

      <ExploreHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        setShowResults={setShowResults}
        searchLoading={searchLoading}
        showResults={showResults}
        searchResults={searchResults}
        handleUserClick={handleUserClick}
        onEcosystemClick={() => navigate("/ecosystem")}
      />

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <OpportunitySection onNavigate={navigate} />

        <UserGrid
          loading={loadingPeople}
          people={people}
          handleUserClick={handleUserClick}
          currentUser={currentUser}
          onSeeAllClick={() => navigate("/people")}
        />

        <CategoryGrid onCategoryClick={handleCategoryClick} />

        <TrendingSection
          onTopicClick={handleTopicClick}
          onProjectClick={handleProjectClick}
        />
      </div>

      <BottomNav />
    </div>
  );
};

export default React.memo(Explore);

