const https = require('https');

const SUPABASE_URL = 'https://sbzsgeokspmkewrmuqgi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNienNnZW9rc3Bta2V3cm11cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3NjQ1OCwiZXhwIjoyMDgxOTUyNDU4fQ.X8-vdb4DaQ4_sOuOXo5Z5Spm6DDuYzyW9KjNmoAcWwo';

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path,
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // 1. Get posts table schema by fetching one row
  console.log('=== POSTS TABLE - first 5 rows ===');
  let r = await get('/rest/v1/posts?limit=5&select=*');
  console.log('Status:', r.status);
  if (r.status === 200) {
    const posts = JSON.parse(r.body);
    if (posts.length > 0) {
      console.log('Columns:', Object.keys(posts[0]).join(', '));
      posts.forEach((p, i) => {
        console.log(`\n--- Post ${i+1} ---`);
        console.log('id:', p.id);
        console.log('content:', (p.content || '').substring(0, 200));
        console.log('tags:', JSON.stringify(p.tags));
        console.log('hashtags:', JSON.stringify(p.hashtags));
        console.log('topics:', JSON.stringify(p.topics));
        console.log('category:', p.category);
        console.log('type:', p.type);
      });
    } else {
      console.log('No posts found');
    }
  } else {
    console.log('Error:', r.body.substring(0, 300));
  }

  // 2. Get total post count
  console.log('\n=== POST COUNT ===');
  r = await get('/rest/v1/posts?select=id');
  if (r.status === 200) {
    const all = JSON.parse(r.body);
    console.log('Total posts:', all.length);
    
    // Extract hashtags from content
    const hashtagMap = {};
    all.forEach(p => {
      const content = p.content || '';
      const matches = content.match(/#[a-zA-Z][a-zA-Z0-9_]*/g) || [];
      matches.forEach(tag => {
        const clean = tag.toLowerCase();
        hashtagMap[clean] = (hashtagMap[clean] || 0) + 1;
      });
    });
    
    const sorted = Object.entries(hashtagMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log('\nTop hashtags from content:');
    sorted.forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
  }

  // 3. Check if there's a hashtags/tags column
  console.log('\n=== ALL posts content sample ===');
  r = await get('/rest/v1/posts?select=content,tags,category&limit=200');
  if (r.status === 200) {
    const posts = JSON.parse(r.body);
    console.log('Fetched:', posts.length, 'posts');
    
    // Check tags column
    const withTags = posts.filter(p => p.tags && (Array.isArray(p.tags) ? p.tags.length > 0 : p.tags !== null));
    console.log('Posts with tags field:', withTags.length);
    if (withTags.length > 0) {
      console.log('Sample tags:', JSON.stringify(withTags.slice(0, 3).map(p => p.tags)));
    }
    
    // Category distribution  
    const catMap = {};
    posts.forEach(p => {
      const cat = p.category || 'none';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    console.log('\nCategory distribution:', JSON.stringify(catMap));
  }
}

main().catch(console.error);
