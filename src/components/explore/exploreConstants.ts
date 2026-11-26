import { Brain, Code, Shield, Cloud, Cpu, Blocks, Smartphone, Database } from "lucide-react";

export const CATEGORIES = [
    { name: "AI & ML", icon: Brain, color: "bg-blue-500" },
    { name: "Web Dev", icon: Code, color: "bg-green-500" },
    { name: "Cybersecurity", icon: Shield, color: "bg-red-500" },
    { name: "Cloud", icon: Cloud, color: "bg-purple-500" },
    { name: "Robotics", icon: Cpu, color: "bg-yellow-500" },
    { name: "Blockchain", icon: Blocks, color: "bg-orange-500" },
    { name: "Mobile Dev", icon: Smartphone, color: "bg-pink-500" },
    { name: "Data Science", icon: Database, color: "bg-teal-500" },
];

// Trending topics are fetched live from DB in TrendingSection component
// This is used only as a fallback for search
export const TRENDING_TOPICS_FALLBACK = [
    { tag: "Robotics", posts: "112" },
    { tag: "Blockchain", posts: "112" },
    { tag: "Cloud", posts: "104" },
    { tag: "Cybersecurity", posts: "99" },
    { tag: "AI & ML", posts: "65" },
    { tag: "Web3", posts: "63" },
    { tag: "DataScience", posts: "62" },
    { tag: "Mobile Dev", posts: "61" },
];

// Keep for search compatibility
export const TRENDING_TOPICS = TRENDING_TOPICS_FALLBACK;

// Real open-source GitHub projects with live demo websites
export const TRENDING_PROJECTS = [
    {
        title: "Excalidraw",
        author: "excalidraw",
        description: "Virtual whiteboard for sketching hand-drawn like diagrams. Supports real-time collaboration and end-to-end encryption.",
        stars: "75k+",
        tech: ["TypeScript", "React", "Canvas"],
        githubUrl: "https://github.com/excalidraw/excalidraw",
        liveUrl: "https://excalidraw.com",
    },
    {
        title: "Hoppscotch",
        author: "hoppscotch",
        description: "Open source API development ecosystem. A lightweight, fast alternative to Postman for REST, GraphQL & WebSocket testing.",
        stars: "61k+",
        tech: ["Vue.js", "TypeScript", "GraphQL"],
        githubUrl: "https://github.com/hoppscotch/hoppscotch",
        liveUrl: "https://hoppscotch.io",
    },
    {
        title: "Cal.com",
        author: "calcom",
        description: "Open-source scheduling infrastructure. The event-charging calendar for everyone — a Calendly alternative.",
        stars: "30k+",
        tech: ["Next.js", "TypeScript", "Prisma"],
        githubUrl: "https://github.com/calcom/cal.com",
        liveUrl: "https://cal.com",
    },
    {
        title: "Formbricks",
        author: "formbricks",
        description: "Privacy-first open source survey & experience management platform. Trigger targeted micro-surveys in-app.",
        stars: "10k+",
        tech: ["Next.js", "TypeScript", "Prisma"],
        githubUrl: "https://github.com/formbricks/formbricks",
        liveUrl: "https://formbricks.com",
    },
    {
        title: "Documenso",
        author: "documenso",
        description: "The open-source DocuSign alternative. Secure, self-hostable document signing built for digital workflows.",
        stars: "9k+",
        tech: ["Next.js", "TypeScript", "tRPC"],
        githubUrl: "https://github.com/documenso/documenso",
        liveUrl: "https://documenso.com",
    },
];
