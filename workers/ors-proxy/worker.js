/**
 * Cloudflare Worker: OpenRouteService API Proxy
 * Keeps API key secure on the server side.
 *
 * Environment variable required:
 *   ORS_API_KEY - Your OpenRouteService API key (set via wrangler secret)
 */

const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'SafeNeighbor ORS Proxy',
      }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    try {
      const apiKey = env.ORS_API_KEY;
      if (!apiKey) {
        console.error('ORS API key not configured');
        return new Response(JSON.stringify({ error: 'API key not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      // Forward the request body directly to ORS
      const body = await request.json();

      const response = await fetch(ORS_DIRECTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ORS API error:', errorText);
        return new Response(JSON.stringify({
          error: 'ORS API error',
          details: errorText,
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};
