import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import { SEO } from "@/components/SEO";
import { ExploreHeader, UserProfile, SearchResult } from "@/components/explore/ExploreHeader";
import { OpportunitySection } from "@/components/explore/OpportunitySection";
import { UserGrid } from "@/components/explore/UserGrid";
import { CategoryGrid } from "@/components/explore/CategoryGrid";
import { TrendingSection } from "@/components/explore/TrendingSection";
import { TRENDING_TOPICS, TRENDING_PROJECTS } from "@/components/explore/exploreConstants";
import { sanitizePostgrestSearch } from "@/lib/security";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const { user: currentUser, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: people = [], isLoading: loadingPeople, refetch: refetchPeople } = useQuery<UserProfile[]>({
    queryKey: ["explore_trending_people", currentUser?.id],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(`
          id, 
          username, 
          full_name, 
          avatar_url, 
          is_verified,
          followers:follows!following_id(count)
        `)
        .order("created_at", { ascending: false })
        .limit(4);

      if (currentUser?.id) {
        query = query.neq("id", currentUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((profile: any) => ({
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        is_verified: profile.is_verified,
        follower_count: profile.followers?.[0]?.count || 0,
      }));
    },
    enabled: !authLoading,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });

  const performSearch = useCallback(async (query: string) => {
    const cleanQuery = sanitizePostgrestSearch(query);
    if (!cleanQuery) return;
    setSearchLoading(true);
    setShowResults(true);

    try {
      // 1. Search People (Supabase)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
        .limit(3);

      const peopleResults: SearchResult[] = (profiles || []).map(p => ({
        id: p.id,
        type: 'person',
        title: p.full_name || p.username,
        subtitle: p.username,
        image: p.avatar_url,
        is_verified: p.is_verified,
        meta: 'Member'
      }));

      // 2. Search Topics (Local Constants)
      const topicResults: SearchResult[] = TRENDING_TOPICS
        .filter(t => t.tag.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2)
        .map(t => ({
          id: t.tag,
          type: 'topic',
          title: t.tag,
          subtitle: `${t.posts} Posts`,
          meta: 'Trending'
        }));

      // 3. Search Projects (Local Constants)
      const projectResults: SearchResult[] = TRENDING_PROJECTS
        .filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.tech.some(t => t.toLowerCase().includes(query.toLowerCase())))
        .slice(0, 2)
        .map(p => ({
          id: p.title,
          type: 'project',
          title: p.title,
          subtitle: `by ${p.author}`,
          meta: `${p.likes} Likes`
        }));

      setSearchResults([...peopleResults, ...topicResults, ...projectResults]);
    } catch (error) {
      logger.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedSearchQuery, performSearch]);

  useEffect(() => {
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
          logger.debug("Real-time profile update received in Explore");
          const updatedProfile = payload.new as unknown as (UserProfile & { [key: string]: unknown });

          if (!updatedProfile || !updatedProfile.id) return;

          queryClient.setQueryData<UserProfile[]>(["explore_trending_people", currentUser?.id], (currentPeople = []) =>
            currentPeople.map(p => {
              if (p.id === updatedProfile.id) {
                return {
                  ...p,
                  username: updatedProfile.username || p.username,
                  full_name: updatedProfile.full_name || p.full_name,
                  avatar_url: updatedProfile.avatar_url || p.avatar_url,
                  is_verified: updatedProfile.is_verified !== undefined ? updatedProfile.is_verified : p.is_verified,
                };
              }
              return p;
            })
          );

          // Update search results
          setSearchResults(currentResults => currentResults.map(p => {
            if (p.type === 'person' && p.id === updatedProfile.id) {
              return {
                ...p,
                title: updatedProfile.full_name || p.title,
                subtitle: updatedProfile.username || p.subtitle,
                image: updatedProfile.avatar_url || p.image,
                is_verified: updatedProfile.is_verified !== undefined ? updatedProfile.is_verified : p.is_verified
              } as SearchResult;
            }
            return p;
          }));
        }
      )
      .subscribe((status) => {
        logger.debug(`Explore real-time subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, queryClient]);

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

