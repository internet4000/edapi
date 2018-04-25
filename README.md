# Proxy API for Discogs

This a node.js proxy api for Discogs. It…

- send authenticated requests to Discogs
- caches everything with a Redis server

## How to use

1. Deploy this repo to any node host (remember to set keys in `.env` file)
2. Where you'd normally request `api.discogs.com`, change it to `edapi.glitch.com`

## How does it work?

1. [Redis database on IBM Cloud](https://www.ibm.com/blogs/bluemix/2018/02/ibm-cloud-compose-redis-available-tls-encryption/)
2. Express.js API
3. `disconnect` module for speaking with Discogs
4. `redisio` module for speaking with Redis
5. A middleware function that either returns cache OR runs route and sets cache

## Does it work?

How to test cache response speed in the terminal

```shell
for x in 1 2 3 4 5 6 7 8 9 10
  curl -s https://edapi.glitch.me/releases/6980600 -o /dev/null -w "\n {time_total}"
end
```
