import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  try {
    // Increment the 'page_views' key in Vercel KV Redis database by 1
    const views = await kv.incr('page_views');
    
    // Return the new total view count
    return response.status(200).json({ views });
  } catch (error) {
    console.error('KV Error:', error);
    return response.status(500).json({ error: 'Failed to fetch views', views: 0 });
  }
}
