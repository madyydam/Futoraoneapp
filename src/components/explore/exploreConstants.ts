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

export const TRENDING_TOPICS = [
    { tag: "ChatGPT-5", posts: "2.4K" },
    { tag: "ReactJS", posts: "1.8K" },
    { tag: "Python", posts: "3.2K" },
    { tag: "DevOps", posts: "1.5K" },
    { tag: "MachineLearning", posts: "2.9K" },
    { tag: "Rust", posts: "1.2K" },
    { tag: "Web3", posts: "2.1K" },
    { tag: "DataScience", posts: "1.9K" },
];

export const TRENDING_PROJECTS = [
    {
        title: "AI Image Generator",
        author: "Saanvi Iyer",
        likes: 342,
        tech: ["Python", "TensorFlow", "React"],
    },
    {
        title: "Blockchain Voting System",
        author: "Arjun Kapoor",
        likes: 289,
        tech: ["Solidity", "Web3", "Node.js"],
    },
    {
        title: "Real-time Chat App",
        author: "Diya Malhotra",
        likes: 456,
        tech: ["WebSocket", "React", "Express"],
    },
    {
        title: "Smart Home Dashboard",
        author: "Vihaan Nair",
        likes: 234,
        tech: ["IoT", "Vue.js", "MQTT"],
    },
    {
        title: "DeFi Exchange",
        author: "Ishaan Gupta",
        likes: 567,
        tech: ["Solidity", "React", "Ethers.js"],
    },
];
