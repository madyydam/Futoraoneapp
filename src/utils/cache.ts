import { openDB, DBSchema } from 'idb';

interface CachedPost {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    image_url: string | null;
    video_url: string | null;
    is_project_update: boolean | null;
    project_id: string | null;
}

interface FutoraDB extends DBSchema {
    posts: {
        key: string;
        value: CachedPost;
    };
}

const DB_NAME = 'futora-db';
const STORE_NAME = 'posts';

export const initDB = async () => {
    return openDB<FutoraDB>(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
};

export const savePostsToCache = async (posts: CachedPost[]) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // We can choose to clear old cache or just upsert.
    // For a feed, clearing and rewriting the top posts is often safer to avoid stale deletions.
    // Optimized: Use Promise.all for parallel batch operations
    await Promise.all(posts.map(post => store.put(post)));
    await tx.done;
};

export const getPostsFromCache = async () => {
    const db = await initDB();
    return db.getAll(STORE_NAME);
};

export const clearCache = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
}
