import { createContext, useContext, useState, ReactNode, useMemo } from "react";

interface UserPresence {
  is_online: boolean;
  last_seen: string;
}

interface UserPresenceContextType {
  onlineUsers: Record<string, UserPresence>;
}

const UserPresenceContext = createContext<UserPresenceContextType | undefined>(undefined);

export const UserPresenceProvider = ({ children }: { children: ReactNode }) => {
  const [onlineUsers] = useState<Record<string, UserPresence>>({});

  const value = useMemo(() => ({ onlineUsers }), [onlineUsers]);

  return (
    <UserPresenceContext.Provider value={value}>
      {children}
    </UserPresenceContext.Provider>
  );
};

export const useUserPresenceContext = () => {
  const context = useContext(UserPresenceContext);
  if (context === undefined) {
    throw new Error("useUserPresenceContext must be used within a UserPresenceProvider");
  }
  return context;
};
