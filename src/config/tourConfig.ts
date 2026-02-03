export interface TourStep {
    selector: string;
    title: string;
    content: string;
    benefit?: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    route?: string;
    action?: string;
}

export interface TourConfig {
    steps: TourStep[];
}

export const TOURS: Record<string, TourConfig> = {
    feed: {
        steps: [
            // --- FEED ---
            {
                selector: "#ai-tools-btn",
                title: "Neural AI Tools",
                content: "Your personal AI mentor — ask, learn, and build faster with powerful LLMs.",
                benefit: "Access cutting-edge AI directly in your workflow.",
                route: "/feed"
            },
            {
                selector: "#stories-row",
                title: "Tech Stories",
                content: "Stay updated with quick bites from tech builders and founders in the community.",
                benefit: "Never miss a beat in the ecosystem."
            },
            {
                selector: "#gamification-bar",
                title: "Your Level & XP",
                content: "Earn XP by posting, engaging, and exploring features to level up your profile.",
                benefit: "Higher levels unlock exclusive rewards."
            },
            {
                selector: "#post-actions-0",
                title: "Engagement",
                content: "Engage with posts to grow your visibility and earn community respect.",
                benefit: "Liking and commenting boosts your social proof."
            },

            // --- EXPLORE ---
            {
                selector: "#opportunity-section",
                title: "Founder Lab",
                content: "Connect with real founders and follow their startup journeys.",
                route: "/explore"
            },
            {
                selector: "#gigs-section",
                title: "Paid Gigs",
                content: "Find real-world paid opportunities and freelance projects.",
                benefit: "Turn your skills into earnings today."
            },
            {
                selector: "#tech-match-card",
                title: "Tech Match",
                content: "Our AI matches you with the right teams based on your stack.",
                benefit: "Unlock this by completing your profile."
            },
            {
                selector: "#game-zone-card",
                title: "Gamer Zone",
                content: "Play, compete on leaderboards, and earn extra rewards.",
                benefit: "Fun way to grow your Futora wallet."
            },
            {
                selector: "#people-to-follow",
                title: "People to Follow",
                content: "Follow top creators and developers to personalize your home feed.",
            },
            {
                selector: "#tech-categories",
                title: "Skill Categories",
                content: "Browse projects and posts by specific tech domains like AI, Web3, or Design.",
            },
            {
                selector: "#trending-topics",
                title: "Trending Topics",
                content: "See what the global tech community is talking about right now.",
            },
            {
                selector: "#top-projects",
                title: "Top Projects",
                content: "Discover the most innovative projects built by Futora creators.",
            },

            // --- MESSAGES ---
            {
                selector: "#messages-tab-link",
                title: "Direct Messages",
                content: "Safe and secure place to connect with other builders and clients.",
                route: "/messages"
            },

            // --- PROFILE ---
            {
                selector: "#theme-toggle",
                title: "Appearance",
                content: "Customize your app theme between Dark and Light mode.",
                route: "/profile"
            },
            {
                selector: "#edit-profile-btn",
                title: "Identity Management",
                content: "Keep your bio and skills updated to attract the right opportunities.",
                action: "openEditProfile"
            },
            {
                selector: "#edit-avatar-trigger",
                title: "Custom Avatar",
                content: "Personalize your presence with high-quality avatars.",
                benefit: "Profiles with avatars get 5x more engagement.",
                route: "/select-avatar"
            },
            {
                selector: "#social-links",
                title: "Social Proof",
                content: "Connect your GitHub, LinkedIn, and Portfolio to build credibility.",
                route: "/profile"
            },
            {
                selector: "#followers-following",
                title: "Your Network",
                content: "Track your growth and see who you are connected with.",
            },
            {
                selector: "#wallet-card-trigger",
                title: "Futora Wallet",
                content: "Total control over your coins, rewards, and job earnings.",
                action: "openWallet"
            },
            {
                selector: "#achievement-hall-of-fame",
                title: "Achievements",
                content: "Showcase your expertise with verified tech badges.",
                action: "openBadges",
                route: "/profile"
            },
            {
                selector: "#achievement-hall-of-fame",
                title: "Hall of Fame",
                content: "See where you stand globally on the Futora leaderboard.",
                action: "openLeaderboard",
                route: "/profile"
            },
            {
                selector: "#report-problem-btn",
                title: "Support",
                content: "Report issues or suggest features directly to the team.",
                route: "/profile"
            },
            {
                selector: "#nav-home",
                title: "You're All Set!",
                content: "Welcome to the future of tech social networking. Go build something amazing! 🚀",
                route: "/feed"
            }
        ]
    }
};
