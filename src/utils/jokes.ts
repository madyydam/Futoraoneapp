export const TECH_JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
    "How many developers does it take to change a light bulb? None, that's a hardware problem! 💡",
    "A SQL query walks into a bar, walks up to two tables, and asks, 'Can I join you?' 📊",
    "Why did the web developer walk out of a restaurant? Because of the table layout! 🍽️",
    "I'd tell you a joke about UDP, but you might not get it. 📡",
    "My code doesn't work? It's not a bug, it's an undocumented feature! 🦄",
    "Software developers: Turning coffee into code since forever. ☕",
    "Real programmers count from 0. 🔟",
    "To understand recursion, you must first understand recursion. 🔄",
    "Why was the JavaScript developer sad? Because they didn't know how to 'null' their feelings. 😢",
    "Keyboard not found. Press any key to continue. ⌨️",
    "I have a joke about CSS, but it's not very well-positioned. 🎨",
    "Why reached the top of the mountain? To get better Wi-Fi! 📶",
    "Bhai, code toh theek hai, bas 'intent' galat hai! 😂",
    "Intern: 'Sir, Production pe push kar doon?' Senior: 'Seedha suicide hi kar le bhai!' ☠️",
    "My code is like a baby: I'm up all night with it and it cries for no reason. 👶",
    "Life is short, use Python. (But for this app, we love TypeScript! 💙)",
    "Why do programmers hate nature? It has too many bugs and no dark mode. 🌲",
    "Success is 10% coding and 90% explaining why the code doesn't work. 🗣️",
    "Error 404: Motivation not found. 💤",
    "Senior dev after seeing my PR: 'Yeh kya bawasir bana diye ho?' 💩",
    "Why was the mobile developer so tired? Because he had too many 'activities'! 📱",
];

export const getRandomJoke = () => {
    return TECH_JOKES[Math.floor(Math.random() * TECH_JOKES.length)];
};
