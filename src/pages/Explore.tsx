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
          const updatedProfile = payload.new as any;

          if (!updatedProfile || !updatedProfile.id) return;

          // Update people grid
          setPeople(currentPeople => {
            const index = currentPeople.findIndex(p => p.id === updatedProfile.id);
            if (index === -1) return currentPeople;

            console.log(`Updating person ${updatedProfile.username} in grid. is_verified: ${updatedProfile.is_verified}`);
            const newPeople = [...currentPeople];
            newPeople[index] = {
              ...newPeople[index],
              username: updatedProfile.username || newPeople[index].username,
              full_name: updatedProfile.full_name || newPeople[index].full_name,
              avatar_url: updatedProfile.avatar_url || newPeople[index].avatar_url,
              is_verified: updatedProfile.is_verified !== undefined ? updatedProfile.is_verified : newPeople[index].is_verified
            };
            return newPeople;
          });

          // Update search results
          setSearchResults(currentResults => {
            const index = currentResults.findIndex(p => p.id === updatedProfile.id);
            if (index === -1) return currentResults;

            const newResults = [...currentResults];
            newResults[index] = {
              ...newResults[index],
              username: updatedProfile.username || newResults[index].username,
              full_name: updatedProfile.full_name || newResults[index].full_name,
              avatar_url: updatedProfile.avatar_url || newResults[index].avatar_url,
              is_verified: updatedProfile.is_verified !== undefined ? updatedProfile.is_verified : newResults[index].is_verified
            };
            return newResults;
          });
        }
      )
      .subscribe((status) => {
        console.log(`Explore real-time subscription status: ${status}`);
      });

    return () => {
      console.log("Cleaning up Explore real-time profile sync...");
      supabase.removeChannel(channel);
    };
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
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

  const fetchPeople = async () => {
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

      // Optimize: Use a single query for counts if possible, or keep as is if volume is low.
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
  };

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

