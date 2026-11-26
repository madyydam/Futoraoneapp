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
  // Fetch up to 500 posts with tags and category
  let r = await get('/rest/v1/posts?select=id,content,tags,category&limit=500&order=created_at.desc');
  if (r.status !== 200) { console.error('Error:', r.body); return; }
  
  const posts = JSON.parse(r.body);
  console.log('Total fetched:', posts.length);

  // Count by tags array
  const tagMap = {};
  const tagPosts = {}; // tag -> array of post snippets

  posts.forEach(p => {
    const tags = Array.isArray(p.tags) ? p.tags : [];
    tags.forEach(tag => {
      const key = tag.trim();
      if (!key) return;
      tagMap[key] = (tagMap[key] || 0) + 1;
      if (!tagPosts[key]) tagPosts[key] = [];
      if (tagPosts[key].length < 3) {
        tagPosts[key].push({
          id: p.id,
          snippet: (p.content || '').substring(0, 100).replace(/\n/g, ' ')
        });
      }
    });

    // Also check category
    if (p.category) {
      const cat = p.category.trim();
      tagMap[cat] = (tagMap[cat] || 0) + 1;
      if (!tagPosts[cat]) tagPosts[cat] = [];
      if (tagPosts[cat].length < 3) {
        tagPosts[cat].push({
          id: p.id,
          snippet: (p.content || '').substring(0, 100).replace(/\n/g, ' ')
        });
      }
    }
  });

  const sorted = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log('\n=== TOP TAGS/TOPICS WITH COUNTS ===');
  sorted.forEach(([tag, count]) => {
    console.log(`"${tag}": ${count} posts`);
  });

  // Output JSON for use in code
  const topTopics = sorted.slice(0, 8).map(([tag, count]) => ({
    tag,
    count,
    samplePosts: tagPosts[tag] || []
  }));
  
  console.log('\n=== JSON FOR CODE ===');
  console.log(JSON.stringify(topTopics, null, 2));
}

main().catch(console.error);
