import { createClient } from 'redis';

export default async function handler(request, response) {
  try {
    // Vercel marketplace sometimes prefixes variables with STORAGE_ or REDIS_ depending on your selection
    const redisUrl = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL;

    // If running locally without env variables, just return fallback
    if (!redisUrl) {
      return response.status(200).json({ views: '...' });
    }

    // Connect using the URL provided by the Vercel Dashboard
    const client = createClient({
      url: redisUrl
    });

    client.on('error', err => console.error('Redis Connection Error:', err));
    await client.connect();

    const views = await client.incr('page_views');
    await client.disconnect();

    return response.status(200).json({ views });
  } catch (error) {
    console.error('Redis Execution Error:', error);
    return response.status(500).json({ error: 'Failed to fetch views', views: 0 });
  }
}
