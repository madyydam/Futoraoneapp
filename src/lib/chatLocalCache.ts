export interface CachedDirectChat {
  messages: unknown[];
  otherUser: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  roomName: string | null;
  updatedAt: number;
}

export interface CachedGroupChat {
  group: {
    id: string;
    name: string;
    description?: string;
    avatar_url: string | null;
    is_public?: boolean;
    is_verified?: boolean;
  } | null;
  messages: unknown[];
  members: unknown[];
  updatedAt: number;
}

const MAX_CACHED_MESSAGES = 100;

export const chatLocalCache = {
  getDirectChat(conversationId: string): CachedDirectChat | null {
    if (!conversationId || typeof window === "undefined") return null;
    try {
      const key = `futora_chat_cache_${conversationId}`;
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setDirectChat(conversationId: string, data: Partial<CachedDirectChat>) {
    if (!conversationId || typeof window === "undefined") return;
    try {
      const key = `futora_chat_cache_${conversationId}`;
      const existing = this.getDirectChat(conversationId) || {
        messages: [],
        otherUser: null,
        roomName: null,
        updatedAt: Date.now(),
      };

      const updatedMessages = data.messages
        ? data.messages.slice(-MAX_CACHED_MESSAGES)
        : existing.messages;

      const merged: CachedDirectChat = {
        messages: updatedMessages,
        otherUser: data.otherUser !== undefined ? data.otherUser : existing.otherUser,
        roomName: data.roomName !== undefined ? data.roomName : existing.roomName,
        updatedAt: Date.now(),
      };

      const str = JSON.stringify(merged);
      sessionStorage.setItem(key, str);
      localStorage.setItem(key, str);
    } catch {
      // Storage quota or parsing safeguard
    }
  },

  getGroupChat(groupId: string): CachedGroupChat | null {
    if (!groupId || typeof window === "undefined") return null;
    try {
      const key = `futora_group_chat_cache_${groupId}`;
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setGroupChat(groupId: string, data: Partial<CachedGroupChat>) {
    if (!groupId || typeof window === "undefined") return;
    try {
      const key = `futora_group_chat_cache_${groupId}`;
      const existing = this.getGroupChat(groupId) || {
        group: null,
        messages: [],
        members: [],
        updatedAt: Date.now(),
      };

      const updatedMessages = data.messages
        ? data.messages.slice(-MAX_CACHED_MESSAGES)
        : existing.messages;

      const merged: CachedGroupChat = {
        group: data.group !== undefined ? data.group : existing.group,
        messages: updatedMessages,
        members: data.members !== undefined ? data.members : existing.members,
        updatedAt: Date.now(),
      };

      const str = JSON.stringify(merged);
      sessionStorage.setItem(key, str);
      localStorage.setItem(key, str);
    } catch {
      // Storage quota safeguard
    }
  },
};
