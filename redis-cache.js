// Start cache with redis
const Redis = require('ioredis')
const { URL } = require('url')
const { REDIS_URL } = process.env
const CACHE_SECONDS = 600

if (REDIS_URL === undefined) {
	console.error('Please set the REDIS_URL environment variable')
	process.exit(1)
}

const redis = new Redis(REDIS_URL, {
	tls: { servername: new URL(REDIS_URL).hostname }
})

redis.on('error', err => console.log('redis err', err))
redis.on('connect', () => console.log('connected to redis'))
redis.on('end', () => console.log('disconnected from redis'))

// Returns cache if it exist, otherwise continues to run the route
async function before(req, res, next) {
  res.locals.key = req.originalUrl
  
	let cache = await redis.get(res.locals.key)
  
  if (cache) {
    console.log('before middleware: found cache')
    res.send(cache)
  } else {
    console.log('before middleware: no cache')
    next()
  }
}

function after(req, res, next) {
  console.log('after middleware')
  const {key, cache} = res.locals
  if (key && cache) {
    console.log('after middleware: saving cache')
    redis.set(key, JSON.stringify(cache), 'EX', CACHE_SECONDS)
  }
  next()
}

module.exports = {
  redis,
  before,
  after
}