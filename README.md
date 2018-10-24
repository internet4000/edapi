# Proxy API for Discogs

This a node.js proxy api for Discogs. It…

- send authenticated requests to Discogs
- caches everything with a Redis server

## How to use

1. Set environment variables in a `.env` file
1. Deploy this repo to any node host 
2. Replace `api.discogs.com` with `edapi.glitch.com` in your requests

## How does it work?

1. Create free Redis database on https://redislabs.com/
2. Express.js API with middleware to cache
3. `disconnect` module for speaking with Discogs
4. `redisio` module for speaking with Redis
5. A middleware function that either returns cache OR runs route and sets cache

## Does it work?

Test the cache response speed in the terminal with `./test-performance.sh`.
You might need to `chmod +x test-performance.sh` as well.

