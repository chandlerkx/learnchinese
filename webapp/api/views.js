import { createClient } from 'redis';

export default async function handler(request, response) {
  try {
    // If running locally without env variables, just return fallback
    if (!process.env.REDIS_URL) {
      return response.status(200).json({ views: '...' });
    }

    // Connect using exactly the REDIS_URL provided by the Vercel Dashboard
    const client = createClient({
      url: process.env.REDIS_URL
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
