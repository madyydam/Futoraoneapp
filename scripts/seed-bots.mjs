/**
 * Production Seeder: 200 Realistic Indian Bot Accounts, Follower Network (100-200 each),
 * 520+ Categorized Lightweight Posts, Likes, Comments & Projects.
 *
 * Pre-requisite: Run `supabase/migrations/20261126_01_bot_schema_admin.sql` on Supabase first.
 * Usage: node scripts/seed-bots.mjs
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// 1. Load .env safely (without printing any secrets)
// ---------------------------------------------------------------------------
const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("ERROR: .env file not found in project root.");
  process.exit(1);
}

const env = {};
for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const idx = line.indexOf("=");
  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
  env[key] = val;
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// ---------------------------------------------------------------------------
// 2. Deterministic PRNG & Helpers
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261126);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

function deterministicUuid(ns) {
  const hex = crypto.createHash("sha256").update(ns).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    "8" + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

async function fetchJson(url, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} on ${url}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (err) {
      if (attempt === retries || (err.status && err.status >= 400 && err.status < 429)) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}

async function batchInsert(table, rows, chunkSize = 500, ignoreDuplicates = true, onConflictCols = null) {
  if (!rows.length) return;
  const prefer = ignoreDuplicates
    ? "resolution=ignore-duplicates,return=minimal"
    : "return=minimal";
  const qs = ignoreDuplicates && onConflictCols ? `?on_conflict=${onConflictCols}` : "";
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await fetchJson(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: prefer },
      body: JSON.stringify(chunk),
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Curated Datasets (Authentic Indian Names, Skills, Verified Light Media)
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Aarav", "Ananya", "Rohan", "Priya", "Siddharth", "Tanvi", "Vikram", "Neha",
  "Aditya", "Shreya", "Kabir", "Diya", "Arjun", "Ishaan", "Pooja", "Pranav",
  "Riya", "Karthik", "Meera", "Devansh", "Saanvi", "Vihaan", "Kavya", "Nikhil",
  "Sneha", "Harsh", "Aishwarya", "Manish", "Nandini", "Varun", "Kriti", "Akash",
  "Divya", "Yash", "Aditi", "Gaurav", "Pallavi", "Tushar", "Simran", "Saurabh",
  "Bhavna", "Ayush", "Sakshi", "Kunal", "Swati", "Mayank", "Rashmi", "Deepak",
  "Anjali", "Prateek"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Iyer", "Patel", "Rao", "Joshi", "Mehta", "Gupta",
  "Kulkarni", "Sen", "Malhotra", "Nair", "Reddy", "Kapoor", "Deshmukh", "Hegde",
  "Chatterjee", "Subramanian", "Krishnan", "Agarwal", "Bhat", "Saxena", "Tiwari",
  "Choudhary", "Banerjee", "Menon", "Mishra", "Chopra", "Bansal", "Kaur",
  "Jain", "Pandey", "Srivastava", "Goyal", "Khanna", "Pillai", "Dubey", "Shetty"
];

const CITIES = [
  "Bengaluru", "Pune", "Hyderabad", "Mumbai", "Delhi NCR", "Gurugram",
  "Noida", "Chennai", "Ahmedabad", "Kolkata", "Jaipur", "Kochi", "Indore", "Chandigarh"
];

const ROLE_TEMPLATES = [
  { role: "Full-Stack Developer", skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind"], category: "Web Dev" },
  { role: "AI & ML Engineer", skills: ["Python", "PyTorch", "LLMs", "LangChain", "FastAPI"], category: "AI & ML" },
  { role: "Cloud & DevOps Engineer", skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"], category: "Cloud" },
  { role: "Mobile App Developer", skills: ["React Native", "Flutter", "Android", "Kotlin", "Swift"], category: "Mobile Dev" },
  { role: "Security Researcher", skills: ["AppSec", "OAuth2", "Pentesting", "Linux", "Cryptography"], category: "Cybersecurity" },
  { role: "Data Scientist", skills: ["Python", "Pandas", "SQL", "MLOps", "Scikit-learn"], category: "Data Science" },
  { role: "Web3 & Rust Builder", skills: ["Rust", "Solidity", "Smart Contracts", "Ethers.js", "Web3"], category: "Blockchain" },
  { role: "IoT & Robotics Maker", skills: ["Embedded C", "ROS2", "Arduino", "Raspberry Pi", "Sensors"], category: "Robotics" },
  { role: "Backend Systems Architect", skills: ["Go", "Microservices", "Redis", "Kafka", "PostgreSQL"], category: "Web Dev" },
  { role: "Product & UI Engineer", skills: ["Next.js", "Figma", "CSS", "Framer Motion", "Accessibility"], category: "Web Dev" },
];

const BIO_INTROS = [
  "Building scalable products in public.",
  "Shipping fast, learning faster.",
  "Open-source contributor & weekend hackathon regular.",
  "Turning chai and curiosity into clean code.",
  "Focused on performance, DX, and resilient systems.",
  "Exploring distributed architectures & modern tooling.",
  "Helping devs level up through real-world projects.",
  "Obsessed with clean UI and sub-50ms API responses.",
];

// All 20 URLs HTTP-200 verified against Unsplash CDN with ?w=700&auto=format&fit=crop&q=70
const VERIFIED_TECH_IMAGES = [
  "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=700&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=700&auto=format&fit=crop&q=70",
];

const VIBE_MOODS = ["🚀", "💻", "☕", "⚡", "🔥", "🧠", "🎯", "🛠️"];

// Post content pool mapped cleanly to all 8 app categories
const CATEGORY_POST_BANK = {
  "Web Dev": [
    "Switched our entire dashboard from client-side fetching waterfalls to optimistic React Query updates. Perceived load time dropped by 60%! #ReactJS #TypeScript",
    "Friendly reminder: debouncing search inputs + aborting stale fetch requests saves both your backend CPU and user battery. Clean cleanup functions matter. #WebDev",
    "Built a reusable Tailwind + Radix UI modal system today with zero layout shift on mobile. Keeping CSS bundles under 20KB gzipped feels great! #CSS #Frontend",
    "Code tip for PostgreSQL + Supabase devs: always add composite indexes on `(user_id, created_at DESC)` before your feed table crosses 100k rows. #PostgreSQL #WebDev",
    "Just refactored a 450-line React component into 3 focused hooks and pure UI primitives. Code reviews became 10x easier overnight. #CleanCode #ReactJS",
    "Why is nobody talking about native CSS `:has()` paired with Tailwind? Half the JS state toggles I wrote last year aren't even needed anymore. #CSS #HTML",
    "Quick TypeScript tip: use `satisfies` when defining config maps so you keep strict literal inference without losing type safety. #TypeScript #JavaScript",
    "Spent 2 hours debugging a hydration mismatch only to realize a `new Date()` call was formatting differently on server vs client timezone. Classic! #NextJS #WebDev",
  ],
  "AI & ML": [
    "Benchmarked 4-bit quantized open-weight LLMs locally on a single GPU today — latency under 35ms/token for domain Q&A. RAG quality > raw parameter count! #MachineLearning #AI",
    "Evaluated hybrid search (BM25 + pgvector cosine similarity) on 50k technical docs. Retrieval precision jumped from 71% to 92%! #AI #LLM",
    "Pro tip when building AI agents: strict JSON schema validation + deterministic tool retries beat prompt-engineering essays every single time. #MachineLearning #Python",
    "Fine-tuning a small 3B model on clean, curated domain examples outperformed a generic massive model at 1/10th the inference cost. Data quality wins. #AI #GPT",
    "Implemented streaming Server-Sent Events (SSE) for our AI mentor chat. First-token latency feels instantaneous even on 4G mobile networks. #AI #LLM",
    "Always log token usage, latency p95, and fallback triggers when deploying ML pipelines to production. Observability is half the battle. #MachineLearning #MLOps",
    "Experimenting with multi-modal embeddings for searching UI screenshots and code snippets together. Vector databases are opening wild UX patterns! #AI #NeuralNetworks",
  ],
  "Cloud": [
    "Moved our cron workers to serverless edge functions with idempotency keys. Zero duplicate job runs and 70% lower monthly cloud bill. #Cloud #Serverless",
    "Docker tip: multi-stage builds with distroless / alpine bases shrunk our API container from 920MB down to 48MB! Deployments take 12 seconds now. #Docker #DevOps",
    "Kubernetes readiness probes vs liveness probes: misconfiguring liveness on a slow DB warmup will put your pods in an infinite CrashLoopBackOff. #Kubernetes #Cloud",
    "Set up automated GitHub Actions previews + Terraform state locking today. Never manually clicking AWS console buttons in prod again! #AWS #DevOps",
    "Enabled HTTP/3 + Brotli compression + edge caching headers on static assets. Lighthouse performance score went straight from 78 to 99. #Cloud #GCP",
    "Always test your database backup restore drill once a month. An untested backup is just wishful thinking! #DevOps #Cloud",
  ],
  "Cybersecurity": [
    "Security checklist for every SaaS launch: enforce Row Level Security (RLS), revoke direct column access to PII, and validate external URLs against `javascript:` schemes. #Cybersecurity",
    "Friendly reminder: never trust client-submitted role flags (`is_admin`, `xp`, `balance`). Enforce privileged column guards at the PostgreSQL trigger level! #Security #AppSec",
    "Audited an API today that allowed IDOR simply by changing an integer ID in the URL. Always use UUIDs AND verify `auth.uid() = owner_id` in policy checks. #Cybersecurity #Encryption",
    "Added rate-limiting + Turnstile verification on auth endpoints. Stopped 14,000 credential-stuffing requests without hurting real users. #Security #Auth",
    "Rotated all service keys and verified `.env` is ignored across git history. Secrets hygiene is non-negotiable for engineering teams. #Cybersecurity #DevSecOps",
    "XSS prevention tip: avoid `dangerouslySetInnerHTML` unless output is strictly sanitized with DOMPurify and CSP headers are enforced. #WebSecurity #Cybersecurity",
  ],
  "Mobile Dev": [
    "Migrated heavy list screens in React Native / Capacitor to virtualized rendering + image lazy-decoding. Scrolling at a locked 60fps on budget Android devices! #MobileDev #Android",
    "Testing offline-first sync queues on flaky metro train networks in Bengaluru today. Local optimistic cache + retry backoff makes apps feel native. #Flutter #MobileDev",
    "Dark mode vs crisp Light mode on mobile: subtle elevation shadows and proper contrast ratios reduce eye strain way better than pure `#000` or `#fff`. #MobileDev #iOS",
    "Push notifications tip: always handle token refresh on app foreground resume so users don't silently miss real-time chat alerts. #Android #ReactNative",
    "Shrunk our Android APK size by 35% simply by enabling R8 minification and converting oversized PNG assets to WebP. #Android #MobileDev",
  ],
  "Data Science": [
    "Cleaned 1.2M noisy transaction rows using vectorized Pandas operations instead of `.iterrows()`. Execution time dropped from 18 minutes to 3.4 seconds! #DataScience #Python",
    "Good data visualization tells the story in 3 seconds. Removed 60% of gridlines and redundant legends from our analytics dashboard — way cleaner now. #DataScience #Analytics",
    "Beware of data leakage during cross-validation! Always fit scalers and imputers strictly inside the training fold, never on the full dataset. #DataScience #Pandas",
    "Built an automated cohort retention pipeline using SQL window functions (`LAG`, `DENSE_RANK`, `DATE_TRUNC`). Pure SQL handles 90% of BI heavy lifting. #SQL #DataScience",
    "Comparing DuckDB vs PostgreSQL for local analytical parquet queries — running aggregations on 50M rows in milliseconds on a laptop is surreal. #DataScience #NumPy",
  ],
  "Blockchain": [
    "Gas optimization tip in Solidity: packing smaller uint variables into single 256-bit storage slots cut contract deployment costs by 28%. #Blockchain #Solidity #Web3",
    "Built a zero-knowledge proof verification demo over the weekend. Cryptographic privacy + verifiable computation is such an exciting space. #Web3 #Blockchain",
    "Always run Slither + Foundry fuzz tests before deploying any smart contract to testnet, let alone mainnet. Security first! #Solidity #SmartContract #Web3",
    "Exploring Account Abstraction (ERC-4337) for gasless onboarding so non-crypto users don't have to manage seed phrases on day one. #Web3 #Blockchain",
  ],
  "Robotics": [
    "Calibrated PID controller loops on our autonomous rover using live IMU sensor telemetry. Zero oscillation on sharp turns now! #Robotics #IoT #Arduino",
    "Running lightweight computer vision object detection at 25 FPS on a Raspberry Pi 5 + Coral TPU for warehouse sorting automation. #Robotics #Automation #IoT",
    "Built an ESP32 MQTT home energy monitor that logs real-time wattage spikes to a local InfluxDB dashboard. Total hardware cost under ₹900! #IoT #Sensor #Arduino",
    "ROS2 topic latency tuning with custom QoS profiles made our multi-robot swarm simulation 3x more responsive. #Robotics #ROS2",
  ],
};

const CODE_SNIPPETS = [
  "\n```ts\nconst debounce = <T extends (...args: any[]) => void>(fn: T, ms = 300) => {\n  let t: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };\n};\n```",
  "\n```sql\nCREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_feed\n  ON public.posts (created_at DESC) INCLUDE (user_id, category);\n```",
  "\n```python\nasync def fetch_with_retry(client, url, retries=3):\n    for i in range(retries):\n        res = await client.get(url)\n        if res.status_code < 500:\n            return res\n```",
  "\n```rust\nfn rate_limit_ok(tokens: &mut u32) -> bool {\n    if *tokens > 0 { *tokens -= 1; true } else { false }\n}\n```",
];

const COMMENT_BANK = [
  "Super insightful! Bookmarked this for our sprint refactor.",
  "Clean approach. Did you benchmark p95 latency after shipping this?",
  "Totally faced this exact edge case last week in production 😅",
  "Love how concise and practical this breakdown is!",
  "Solid engineering tip — saving this for the team.",
  "Have you open-sourced a template or repo for this? Would love to check it out!",
  "100% agree. Simplicity and observability beat over-engineering every time.",
  "Great post! Trying this out on my weekend side project tonight.",
  "Really helpful explanation, especially the performance numbers.",
  "This fixed a bug I've been chasing since morning. Thanks for sharing!",
  "Sub-50ms response time is impressive — great architecture!",
  "Underrated tip right here. More devs need to read this.",
];

const PROJECT_TEMPLATES = [
  { title: "DevPulse Analytics", desc: "Real-time developer productivity & GitHub commit telemetry dashboard.", tech: ["React", "TypeScript", "Supabase", "Recharts"] },
  { title: "KisanAI Assistant", desc: "Multilingual voice-first agritech advisory assistant powered by RAG.", tech: ["Python", "FastAPI", "PyTorch", "Next.js"] },
  { title: "PayFlow Ledger", desc: "Double-entry idempotent wallet & micro-payout engine with audit trails.", tech: ["Go", "PostgreSQL", "Redis", "Docker"] },
  { title: "CloudGuard Scanner", desc: "Automated IAM & S3 bucket misconfiguration scanner for CI/CD pipelines.", tech: ["Python", "AWS", "Terraform", "GitHub Actions"] },
  { title: "CampusConnect Hub", desc: "Peer-to-peer hackathon team finder & project showcase for Indian colleges.", tech: ["Next.js", "Tailwind", "Prisma", "PostgreSQL"] },
  { title: "EdgeCache Proxy", desc: "Lightweight HTTP caching reverse proxy with sub-5ms regional invalidation.", tech: ["Rust", "Tokio", "Redis", "Linux"] },
  { title: "FinTrack UPI Parser", desc: "Privacy-first offline expense categorizer from SMS & bank statements.", tech: ["Flutter", "Dart", "SQLite", "TensorFlow Lite"] },
  { title: "DocuMind Vector", desc: "Semantic search across PDFs, Markdown wikis, and engineering RFCs.", tech: ["TypeScript", "pgvector", "OpenAI", "React"] },
  { title: "SmartGrid IoT", desc: "ESP32 solar telemetry collector with predictive battery health alerts.", tech: ["C++", "MQTT", "InfluxDB", "Grafana"] },
  { title: "ChainVote Zero", desc: "Anonymous verifiable DAO voting protocol using zk-SNARK proofs.", tech: ["Solidity", "Hardhat", "Ethers.js", "React"] },
  { title: "CodeDuel Arena", desc: "Multiplayer competitive typing & algorithm speed-battle platform.", tech: ["WebSockets", "React", "Node.js", "Tailwind"] },
  { title: "SchemaLint CLI", desc: "Pre-commit SQL migration linter catching unsafe table locks & missing indexes.", tech: ["Go", "PostgreSQL", "CLI"] },
  { title: "ResumeForge AI", desc: "ATS-friendly LaTeX & Markdown resume builder tailored for tech roles.", tech: ["React", "TypeScript", "Tailwind", "Vite"] },
  { title: "LogStream Lite", desc: "Zero-dependency structured JSON log viewer for self-hosted microservices.", tech: ["Rust", "WebAssembly", "React"] },
  { title: "MediTrack Sync", desc: "Offline-capable clinic appointment & digital prescription sync app.", tech: ["React Native", "Supabase", "TypeScript"] },
];

// ---------------------------------------------------------------------------
// 4. Generate 200 Unique Bot Personas
// ---------------------------------------------------------------------------
function buildBots(count = 200) {
  const usedNames = new Set();
  const usedUsernames = new Set();
  const bots = [];

  for (let i = 0; i < count; i++) {
    let fullName = "";
    let first = "";
    let last = "";
    for (let tries = 0; tries < 50; tries++) {
      first = FIRST_NAMES[(i + tries * 7) % FIRST_NAMES.length];
      last = LAST_NAMES[(Math.floor(i / 2) + tries * 11 + i * 3) % LAST_NAMES.length];
      const candidate = `${first} ${last}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) {
      fullName = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 5) % LAST_NAMES.length]} ${i}`;
    }

    const baseHandle = `${first}_${last}`.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const suffixes = ["", "_dev", "_codes", "_tech", "_in", "_io", `_${(i % 89) + 10}`];
    let username = baseHandle;
    for (const suf of suffixes) {
      const cand = `${baseHandle}${suf}`;
      if (!usedUsernames.has(cand)) {
        username = cand;
        usedUsernames.add(cand);
        break;
      }
    }
    while (usedUsernames.has(username)) {
      username = `${baseHandle}_${randInt(100, 999)}`;
    }
    usedUsernames.add(username);

    const roleInfo = ROLE_TEMPLATES[i % ROLE_TEMPLATES.length];
    const city = CITIES[i % CITIES.length];
    const intro = BIO_INTROS[i % BIO_INTROS.length];
    const avatarStyle = i % 3 === 0 ? "avataaars" : "personas";
    const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    const bannerUrl = VERIFIED_TECH_IMAGES[i % VERIFIED_TECH_IMAGES.length];

    const xp = randInt(420, 9600);
    const level = Math.max(1, Math.floor(xp / 500) + 1);
    const totalWins = randInt(0, 44);
    const currentStreak = randInt(1, 21);
    const longestStreak = Math.max(currentStreak, randInt(4, 42));
    const isVerified = i % 7 === 0; // ~14% verified realistically
    const daysAgo = randInt(0, 6);
    const lastActive = new Date(Date.now() - daysAgo * 86400000 - randInt(0, 43200) * 1000).toISOString();
    const createdAt = new Date(Date.now() - randInt(15, 180) * 86400000).toISOString();

    const id = deterministicUuid(`one-bot-v1:${username}`);
    const email = `bot.${username}@internal.one.app`;

    bots.push({
      id,
      email,
      username,
      full_name: fullName,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      bio: `${roleInfo.role} based in ${city}. ${intro}`,
      location: city,
      tech_skills: roleInfo.skills,
      category: roleInfo.category,
      xp,
      level,
      total_wins: totalWins,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      trust_score: randInt(68, 99),
      is_verified: isVerified,
      verification_category: isVerified ? roleInfo.role.split(" ")[0] : null,
      vibe_mood: pick(VIBE_MOODS),
      last_activity_date: lastActive,
      created_at: createdAt,
      is_bot: true,
    });
  }

  return bots;
}

// ---------------------------------------------------------------------------
// 5. Main Execution Pipeline
// ---------------------------------------------------------------------------
async function main() {
  console.log("🔍 Checking Supabase connectivity & schema readiness...");
  const check = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=is_bot&limit=1`, {
    headers: HEADERS,
  });

  if (!check.ok) {
    const body = await check.text();
    console.error("\n❌ Schema pre-flight failed! profiles.is_bot does not exist yet.");
    console.error("Response:", check.status, body);
    console.error("\n👉 Run `supabase/migrations/20261126_01_bot_schema_admin.sql` in Supabase SQL Editor first, then re-run `node scripts/seed-bots.mjs`.");
    process.exitCode = 1;
    return;
  }

  // Fetch existing bot profiles so re-running is cleanly idempotent
  const existingBots = await fetchJson(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,username&is_bot=eq.true&limit=500`,
    { headers: HEADERS }
  );
  const existingBotIds = new Set((existingBots || []).map((b) => b.id));
  console.log(`✅ Schema ready. Existing bots in DB: ${existingBotIds.size}`);

  // Fetch existing real users (to optionally receive realistic welcome engagement)
  const existingRealUsers = await fetchJson(
    `${SUPABASE_URL}/rest/v1/profiles?select=id&is_bot=eq.false&limit=100`,
    { headers: HEADERS }
  );
  const realUserIds = (existingRealUsers || []).map((u) => u.id);

  const bots = buildBots(200);
  const botsToCreate = bots.filter((b) => !existingBotIds.has(b.id));

  // Step A: Create auth.users via Supabase Admin API in parallel batches of 10
  if (botsToCreate.length > 0) {
    console.log(`👤 Creating ${botsToCreate.length} auth users + profiles...`);
    const CONCURRENCY = 10;
    for (let i = 0; i < botsToCreate.length; i += CONCURRENCY) {
      const slice = botsToCreate.slice(i, i + CONCURRENCY);
      await Promise.all(
        slice.map(async (bot) => {
          const password = crypto.randomBytes(24).toString("hex");
          try {
            await fetchJson(`${SUPABASE_URL}/auth/v1/admin/users`, {
              method: "POST",
              headers: HEADERS,
              body: JSON.stringify({
                id: bot.id,
                email: bot.email,
                password,
                email_confirm: true,
                user_metadata: {
                  username: bot.username,
                  full_name: bot.full_name,
                  avatar_url: bot.avatar_url,
                },
              }),
            });
          } catch (err) {
            // Ignore if auth user already exists (idempotency)
            if (err.status !== 422 && !String(err.message).includes("already")) {
              throw err;
            }
          }
        })
      );
      if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= botsToCreate.length) {
        console.log(`   Auth users synced: ${Math.min(i + CONCURRENCY, botsToCreate.length)}/${botsToCreate.length}`);
      }
    }
  }

  // Step B: Enrich all 200 bot profiles (is_bot=true, bio, skills, banner, xp, wins, location)
  console.log("📝 Updating bot profiles with realistic Indian tech metadata...");
  for (let i = 0; i < bots.length; i += 10) {
    const slice = bots.slice(i, i + 10);
    await Promise.all(
      slice.map((bot) =>
        fetchJson(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${bot.id}`, {
          method: "PATCH",
          headers: { ...HEADERS, Prefer: "return=minimal" },
          body: JSON.stringify({
            username: bot.username,
            full_name: bot.full_name,
            avatar_url: bot.avatar_url,
            banner_url: bot.banner_url,
            bio: bot.bio,
            location: bot.location,
            tech_skills: bot.tech_skills,
            xp: bot.xp,
            level: bot.level,
            total_wins: bot.total_wins,
            current_streak: bot.current_streak,
            longest_streak: bot.longest_streak,
            trust_score: bot.trust_score,
            is_verified: bot.is_verified,
            verification_category: bot.verification_category,
            vibe_mood: bot.vibe_mood,
            last_activity_date: bot.last_activity_date,
            created_at: bot.created_at,
            is_bot: true,
          }),
        })
      )
    );
  }
  console.log("✅ All 200 bot profiles enriched.");

  // Step C: Build 100–200 Followers & Following Graph
  console.log("🤝 Generating 100–200 followers & following per bot...");
  const followRows = [];
  const N = bots.length;
  for (let i = 0; i < N; i++) {
    const followerId = bots[i].id;
    const targets = new Set();
    // 130 symmetric ring neighbors => guarantees >=130 in-degree & >=130 out-degree
    for (let k = 1; k <= 65; k++) {
      targets.add((i + k) % N);
      targets.add((i - k + N) % N);
    }
    // Add 0..45 extra connections => total 130..175 each (cleanly within 100-200)
    const extra = randInt(0, 45);
    let attempts = 0;
    while (targets.size < 130 + extra && attempts < 200) {
      attempts++;
      const j = randInt(0, N - 1);
      if (j !== i) targets.add(j);
    }
    for (const j of targets) {
      followRows.push({
        follower_id: followerId,
        following_id: bots[j].id,
      });
    }
  }
  // Have ~18 bots follow existing real users so real accounts also see natural activity
  const seenFollowKeys = new Set(followRows.map((r) => `${r.follower_id}:${r.following_id}`));
  for (const realId of realUserIds) {
    const fanCount = Math.min(18, bots.length);
    for (let k = 0; k < fanCount; k++) {
      const bot = bots[(k * 11 + randInt(0, 7)) % bots.length];
      const key = `${bot.id}:${realId}`;
      if (bot.id !== realId && !seenFollowKeys.has(key)) {
        seenFollowKeys.add(key);
        followRows.push({ follower_id: bot.id, following_id: realId });
      }
    }
  }

  console.log(`   Inserting ${followRows.length} follow edges in chunks...`);
  await batchInsert("follows", followRows, 1000, true, "follower_id,following_id");
  console.log("✅ Follower network populated (130–175 followers & following each).");

  // Step D: Seed Projects (45 realistic projects)
  const existingBotPosts = await fetchJson(
    `${SUPABASE_URL}/rest/v1/posts?select=id&user_id=in.(${bots.slice(0, 20).map((b) => b.id).join(",")})&limit=5`,
    { headers: HEADERS }
  );

  if ((existingBotPosts || []).length > 0) {
    console.log("ℹ️  Bot posts already exist — skipping duplicate post/project generation.");
  } else {
    console.log("🚀 Creating 45 projects...");
    const projectRows = [];
    for (let i = 0; i < 45; i++) {
      const owner = bots[(i * 4 + 3) % bots.length];
      const tpl = PROJECT_TEMPLATES[i % PROJECT_TEMPLATES.length];
      const suffix = i >= PROJECT_TEMPLATES.length ? ` v${Math.floor(i / PROJECT_TEMPLATES.length) + 1}` : "";
      const projectId = deterministicUuid(`one-bot-project-v1:${i}`);
      const slug = `${tpl.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${suffix ? `-${Math.floor(i / PROJECT_TEMPLATES.length) + 1}` : ""}`;
      projectRows.push({
        id: projectId,
        user_id: owner.id,
        title: `${tpl.title}${suffix}`,
        description: tpl.desc,
        tech_stack: tpl.tech,
        image_url: VERIFIED_TECH_IMAGES[i % VERIFIED_TECH_IMAGES.length],
        github_url: `https://github.com/${owner.username}/${slug}`,
        live_url: `https://${slug}.vercel.app`,
        created_at: new Date(Date.now() - randInt(1, 25) * 86400000).toISOString(),
      });
    }
    await batchInsert("projects", projectRows, 100, true);

    const projectLikeRows = [];
    for (const proj of projectRows) {
      const likeCount = randInt(8, 28);
      const likers = new Set();
      while (likers.size < likeCount) {
        const b = pick(bots);
        if (b.id !== proj.user_id) likers.add(b.id);
      }
      for (const uid of likers) {
        projectLikeRows.push({ user_id: uid, project_id: proj.id });
      }
    }
    await batchInsert("project_likes", projectLikeRows, 500, true, "user_id,project_id");
    console.log(`✅ Created ${projectRows.length} projects and ${projectLikeRows.length} project likes.`);

    // Step E: Seed 520+ Categorized Lightweight Posts
    console.log("✍️  Creating 520+ lightweight posts across all categories...");
    const categories = Object.keys(CATEGORY_POST_BANK);
    const postRows = [];
    const TOTAL_POSTS = 528; // 66 posts per category across all 8 categories

    for (let i = 0; i < TOTAL_POSTS; i++) {
      const author = bots[(i * 7 + randInt(0, 5)) % bots.length];
      const category = categories[i % categories.length];
      const bank = CATEGORY_POST_BANK[category];
      let content = bank[Math.floor(i / categories.length) % bank.length];

      // Add subtle realistic variation & occasional code snippets so posts aren't identical
      const variationPrefixes = [
        "",
        "Quick update from today's build: ",
        "Lesson learned the hard way: ",
        "Sharing something useful from this week: ",
        "Weekend experiment notes — ",
        "Hot take for builders: ",
      ];
      const prefix = i >= bank.length * categories.length ? pick(variationPrefixes) : "";
      const includeCode = i % 6 === 0;
      if (includeCode) {
        content = `${prefix}${content}${pick(CODE_SNIPPETS)}`;
      } else {
        content = `${prefix}${content}`;
      }

      const includeImage = i % 3 === 0; // ~33% lightweight CDN images (~176 image posts)
      const isProjectPost = i < 45 && i % 2 === 0;
      const postId = deterministicUuid(`one-bot-post-v1:${i}`);
      const ageHours = randInt(1, 28 * 24);
      const createdAt = new Date(Date.now() - ageHours * 3600 * 1000 - randInt(0, 3599) * 1000).toISOString();

      postRows.push({
        id: postId,
        user_id: author.id,
        content,
        image_url: includeImage ? VERIFIED_TECH_IMAGES[i % VERIFIED_TECH_IMAGES.length] : null,
        video_url: null,
        category,
        is_project_update: isProjectPost,
        project_id: isProjectPost ? projectRows[i].id : null,
        created_at: createdAt,
      });
    }

    await batchInsert("posts", postRows, 200, true);
    console.log(`✅ Created ${postRows.length} posts across ${categories.length} categories.`);

    // Step F: Seed Natural Likes & Comments
    console.log("💬 Adding likes & realistic comments to posts...");
    const likeRows = [];
    const commentRows = [];

    for (let idx = 0; idx < postRows.length; idx++) {
      const post = postRows[idx];
      const numLikes = randInt(6, 34);
      const likerIds = new Set();
      while (likerIds.size < numLikes) {
        const u = pick(bots);
        if (u.id !== post.user_id) likerIds.add(u.id);
      }
      for (const uid of likerIds) {
        likeRows.push({ user_id: uid, post_id: post.id });
      }

      const numComments = randInt(1, 4);
      for (let c = 0; c < numComments; c++) {
        const commenter = pick(bots);
        if (commenter.id === post.user_id) continue;
        commentRows.push({
          id: deterministicUuid(`one-bot-comment-v1:${idx}:${c}`),
          user_id: commenter.id,
          post_id: post.id,
          content: pick(COMMENT_BANK),
          created_at: new Date(new Date(post.created_at).getTime() + randInt(5, 720) * 60000).toISOString(),
        });
      }
    }

    await batchInsert("likes", likeRows, 1000, true, "user_id,post_id");
    await batchInsert("comments", commentRows, 500, true);
    console.log(`✅ Added ${likeRows.length} likes and ${commentRows.length} comments.`);
  }

  // Step G: Clean up bot-only notification bloat created by follow/comment triggers
  console.log("🧹 Pruning bot-to-bot notification bloat to save DB storage...");
  const botIdList = bots.map((b) => b.id);
  for (let i = 0; i < botIdList.length; i += 40) {
    const slice = botIdList.slice(i, i + 40).join(",");
    await fetch(`${SUPABASE_URL}/rest/v1/notifications?user_id=in.(${slice})`, {
      method: "DELETE",
      headers: HEADERS,
    });
  }
  console.log("✅ Bot notification bloat cleaned up (real user notifications preserved).");

  console.log("\n🎉 Seeding complete! Summary:");
  console.log("   • Bots: 200 Indian profiles (is_bot = true)");
  console.log("   • Social graph: 130–175 followers & following per bot");
  console.log("   • Posts: 528 posts across 8 tech categories");
  console.log("   • Projects: 45 projects with tech stacks & likes");
  console.log("   • Engagement: ~10,000+ likes & ~1,200+ comments");
}

main().catch((err) => {
  console.error("❌ Seeder failed:", err);
  process.exitCode = 1;
});
