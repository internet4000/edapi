// Start express.js
const express = require('express')
const app = express()

// Start Discogs API client
const Discogs = require('disconnect').Client
const db = new Discogs('ExplorerDiscogsApi/0.0.0').database()

// Start cache with redis
const Redis = require('ioredis')
const { URL } = require('url')
const { REDIS_URL } = process.env
const CACHE_SECONDS = 60

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

// Runs before a route. If cache exists the route is skipped.
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

app.use(before)

// express routes
app.get('/', (req, res, next) => {
  res.send({
    msg: 'Proxy API for Discogs',
    test: `https://${req.headers.host}/releases/6980600`,
    help: 'Call your internet provider'
  })
})

app.get('/releases/:id', async (req, res, next) => {
  console.log('route', res.locals)
  const data = await db.getRelease(req.params.id)
  console.log('fetched data')
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

app.use(after)

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
