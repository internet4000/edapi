// Start express.js
const express = require('express')
const app = express()


// Start Discogs API client
const Discogs = require('disconnect').Client
const db = new Discogs('ExplorerDiscogsApi/0.0.0', {
	consumerKey: process.env.DISCOGS_KEY, 
	consumerSecret: process.env.DISCOGS_SECRET
}).database()


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



// Express middleware.

// Returns cache if possible. Otherwise skips to next.
async function loadCache(req, res, next) {
  res.locals.key = req.originalUrl
  
	let cache = await redis.get(res.locals.key)
  
  if (cache) {
    console.log('using cache')
    res.send(cache)
  } else {
    next()
  }
}

// Saves cache (requires `res.locals.key` and `res.locals.cache` (the data to store)
function saveCache(req, res, next) {
  const {key, cache} = res.locals
  if (key && cache) {
    console.log('saving cache')
    redis.set(key, JSON.stringify(cache), 'EX', CACHE_SECONDS)
  }
  next()
}

app.use(loadCache)

// express routes
app.get('/', (req, res, next) => {
  res.send({
    msg: 'Proxy API for Discogs',
    'test release': `https://${req.headers.host}/releases/6980600`,
    'test label': `https://${req.headers.host}/labels/840950`,
    'test master': `https://${req.headers.host}/masters/74177`
  })
})

app.get('/releases/:id', async (req, res, next) => {
  const data = await db.getRelease(req.params.id)
  res.locals.cache = data
  res.send(data)
  next() // call 'after' middleware
})

app.get('/labels/:id', async (req, res, next) => {
  const data = await db.getLabel(req.params.id)
  res.locals.cache = data // store data so we can access in 'after' middleware
  res.send(data)
  next()
})

app.get('/masters/:id', async (req, res, next) => {
  const data = await db.getMaster(req.params.id)
  res.locals.cache = data // store data so we can access in 'after' middleware
  res.send(data)
  next()
})

app.use(saveCache)

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
