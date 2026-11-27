import { describe, it, expect, beforeEach } from "vitest";
import { chatLocalCache } from "@/lib/chatLocalCache";

describe("chatLocalCache", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores and retrieves direct chat data correctly", () => {
    const convId = "conv-123";
    const messages = [
      { id: "m-1", content: "Hello", sender_id: "user-1", created_at: "2026-11-27T00:00:00Z" },
      { id: "m-2", content: "World", sender_id: "user-2", created_at: "2026-11-27T00:01:00Z" },
    ];
    const otherUser = {
      id: "user-2",
      username: "alice",
      full_name: "Alice Dev",
      avatar_url: "https://example.com/avatar.jpg",
    };

    chatLocalCache.setDirectChat(convId, {
      messages,
      otherUser,
      roomName: "Dev Room",
    });

    const cached = chatLocalCache.getDirectChat(convId);
    expect(cached).not.toBeNull();
    expect(cached?.messages).toHaveLength(2);
    expect(cached?.otherUser?.username).toBe("alice");
    expect(cached?.roomName).toBe("Dev Room");
  });

  it("trims messages to max limit of 100 to avoid storage overflow", () => {
    const convId = "conv-large";
    const manyMessages = Array.from({ length: 150 }, (_, i) => ({
      id: `m-${i}`,
      content: `Message ${i}`,
      sender_id: "user-1",
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }));

    chatLocalCache.setDirectChat(convId, { messages: manyMessages });

    const cached = chatLocalCache.getDirectChat(convId);
    expect(cached?.messages).toHaveLength(100);
    // Should preserve the most recent 100 messages (from index 50 to 149)
    expect((cached?.messages[0] as any).id).toBe("m-50");
    expect((cached?.messages[99] as any).id).toBe("m-149");
  });

  it("stores and retrieves group chat data correctly", () => {
    const groupId = "grp-456";
    const group = {
      id: groupId,
      name: "React Masters",
      description: "Everything React",
      avatar_url: null,
      is_public: true,
      is_verified: true,
    };
    const members = [
      { user_id: "u-1", role: "admin", profiles: { full_name: "Admin", avatar_url: null } },
    ];

    chatLocalCache.setGroupChat(groupId, {
      group,
      members,
      messages: [{ id: "gm-1", content: "Welcome to group", sender_id: "u-1" }],
    });

    const cached = chatLocalCache.getGroupChat(groupId);
    expect(cached).not.toBeNull();
    expect(cached?.group?.name).toBe("React Masters");
    expect(cached?.members).toHaveLength(1);
    expect(cached?.messages).toHaveLength(1);
  });

  it("safely handles null/empty IDs without throwing errors", () => {
    expect(chatLocalCache.getDirectChat("")).toBeNull();
    expect(chatLocalCache.getGroupChat("")).toBeNull();
    expect(() => chatLocalCache.setDirectChat("", { messages: [] })).not.toThrow();
    expect(() => chatLocalCache.setGroupChat("", { messages: [] })).not.toThrow();
  });
});
