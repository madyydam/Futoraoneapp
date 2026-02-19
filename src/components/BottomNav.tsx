import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, Plus, MessageCircle, User as UserIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/hooks/useAuth";

export const BottomNav = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const unreadCount = useUnreadMessages(userId);

  const isActive = useCallback((path: string) => {
    if (path === "/explore" && location.pathname === "/tech-reels") return true;
    return location.pathname === path;
  }, [location.pathname]);

  const handleNavigate = useCallback((path: string) => navigate(path), [navigate]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-black/20 dark:border-border z-50 shadow-lg text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-around">
        <Button
          variant={isActive("/feed") ? "default" : "ghost"}
          size="icon"
          id="nav-home"
          className={`rounded-xl transition-all ${isActive("/feed") ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"}`}
          onClick={() => handleNavigate("/feed")}
        >
          <Home className="w-6 h-6" />
        </Button>
        <Button
          variant={isActive("/explore") ? "default" : "ghost"}
          size="icon"
          className={`rounded-xl transition-all ${isActive("/explore") ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"}`}
          onClick={() => handleNavigate("/explore")}
        >
          <Search className="w-6 h-6" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="gradient-primary text-white rounded-full shadow-lg scale-110"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="mb-4">
            <DropdownMenuItem onClick={() => handleNavigate("/create-post")} className="gap-2 cursor-pointer">
              <span className="font-medium">Create Post</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigate("/create-story")} className="gap-2 cursor-pointer">
              <span className="font-medium">Create Reel</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="relative">
          <Button
            variant={isActive("/messages") ? "default" : "ghost"}
            size="icon"
            id="messages-tab-link"
            className={`rounded-xl transition-all ${isActive("/messages") ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"}`}
            onClick={() => handleNavigate("/messages")}
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-2 border-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
        <Button
          variant={isActive("/profile") ? "default" : "ghost"}
          size="icon"
          className={`rounded-xl transition-all ${isActive("/profile") ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"}`}
          onClick={() => handleNavigate("/profile")}
        >
          <UserIcon className="w-6 h-6" />
        </Button>
      </div>
    </nav>
  );
});
