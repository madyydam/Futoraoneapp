// Cartoon Avatar Collection using DiceBear API
// These avatars provide consistent, high-quality cartoon representations

export interface AvatarOption {
    id: string;
    name: string;
    url: string;
    seed: string;
}

// Premium styles
const AVATAR_STYLES = {
    cartoon: 'avataaars',    // Original Modern Cartoon
    premium3d: 'personas'   // Elite 3D Glossy (Bitmoji style)
};

// Original 48 Cartoon Seeds
const CARTOON_SEEDS = [
    'Felix', 'Aneka', 'Jasmine', 'Oliver', 'Luna', 'Max',
    'Mia', 'Charlie', 'Lucy', 'Cooper', 'Bella', 'Rocky',
    'Daisy', 'Duke', 'Molly', 'Bear', 'Sadie', 'Jack',
    'Sophie', 'Toby', 'Maggie', 'Zeus', 'Chloe', 'Leo',
    'Caleb', 'Bailey', 'Zoe', 'Tucker', 'Harley', 'Riley',
    'Oscar', 'Roxy', 'Shadow', 'Buddy', 'Buster', 'Coco',
    'Lola', 'Nala', 'Ruby', 'Stella', 'Rosie', 'Penny',
    'Gus', 'Bentley', 'Gracie', 'Abby', 'Bruno', 'King'
];

// 100+ Premium 3D Seeds
const PREMIUM_3D_SEEDS = [
    'Aidan', 'Amaya', 'Jocelyn', 'Quinn', 'Skyler', 'Justice', 'Emerson', 'Sage', 'Parker', 'Charlie',
    'Eden', 'Ariel', 'River', 'Sasha', 'Rory', 'Remi', 'Marlowe', 'Haven', 'Phoenix', 'Stevie',
    'Jack', 'Luna', 'Max', 'Bella', 'Leo', 'Mia', 'Oliver', 'Lucy', 'Charlie', 'Molly',
    'Cooper', 'Daisy', 'Toby', 'Sophie', 'Bear', 'Sadie', 'Duke', 'Ruby', 'Zeus', 'Chloe',
    'Harley', 'Roxy', 'Buster', 'Lola', 'Buddy', 'Stella', 'Rocky', 'Penny', 'Gus', 'Nala',
    'Simba', 'Willow', 'Jasper', 'Piper', 'Finley', 'Nova', 'Ryder', 'Koda', 'Ivy', 'Enzo',
    'Cleo', 'Hugo', 'Maya', 'Arlo', 'Xena', 'Atlas', 'Zelda', 'Mochi', 'Link', 'Sora',
    'Yuki', 'Kiko', 'Taro', 'Mika', 'Sumi', 'Kenji', 'Hana', 'Ryu', 'Nori', 'Yumi',
    'Zane', 'Lyra', 'Orion', 'Vesper', 'Cyrus', 'Thalia', 'Dante', 'Indra', 'Silas', 'Calla',
    'Elias', 'Freya', 'Gideon', 'Hestia', 'Julian', 'Kael', 'Leona', 'Malik', 'Naomi', 'Odin'
];

// Generate Full Ultimate Collection
const generateOptions = (): AvatarOption[] => {
    const options: AvatarOption[] = [];

    // 1. Add Original 48 Cartoons first
    CARTOON_SEEDS.forEach((seed, index) => {
        options.push({
            id: `v1-${index + 1}`,
            name: `Cartoon ${index + 1}`,
            url: `https://api.dicebear.com/7.x/${AVATAR_STYLES.cartoon}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            seed
        });
    });

    // 2. Add 100+ Elite 3D Personas after
    PREMIUM_3D_SEEDS.forEach((seed, index) => {
        options.push({
            id: `p3d-${index + 1}`,
            name: `Persona ${index + 1}`,
            url: `https://api.dicebear.com/7.x/${AVATAR_STYLES.premium3d}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            seed
        });
    });

    return options;
};

export const AVATAR_OPTIONS: AvatarOption[] = generateOptions();

/**
 * Get a random avatar from the collection
 */
export const getRandomAvatar = (): AvatarOption => {
    const randomIndex = Math.floor(Math.random() * AVATAR_OPTIONS.length);
    return AVATAR_OPTIONS[randomIndex];
};

/**
 * Get avatar URL by seed/name
 */
export const getAvatarBySeed = (seed: string): string => {
    // Default to the premium 3D style for all new seeds
    return `https://api.dicebear.com/7.x/${AVATAR_STYLES.premium3d}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

/**
 * Get avatar option by ID
 */
export const getAvatarById = (id: string): AvatarOption | undefined => {
    return AVATAR_OPTIONS.find(avatar => avatar.id === id);
};

/**
 * Get avatar URL by user ID (for consistent default avatars)
 */
export const getDefaultAvatarForUser = (userId: string): string => {
    // Use user ID as seed for consistent premium 3D avatar generation
    return `https://api.dicebear.com/7.x/${AVATAR_STYLES.premium3d}/svg?seed=${userId}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};
