// init express
const express = require('express')
const app = express()

// init discogs client
const Discogs = require('disconnect').Client
const db = new Discogs('ExplorerDiscogsApi/0.0.0').database()

// init cache
const Redis = require('ioredis')
const { URL } = require('url')

const { REDIS_URL } = process.env

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

const CACHE_SECONDS = 60

async function before(req, res, next) {
  res.locals.key = req.originalUrl
  console.log('before middleware', res.locals)
  
  // return from cache if possible
	let cache = await redis.get(res.locals.key)
  if (cache) {
    console.log('before middleware: found cache')
    res.locals.cache = cache
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
    msg: 'discogs proxy api',
    test: 'https://edapi.glitch.me/releases/6980600'
  })
})

app.get('/releases/:id', async (req, res, next) => {
  console.log('route', res.locals)
  db.getRelease(req.params.id, (err, data) => {
    res.locals.cache = data
    res.send(data)
    next()
  })
})

app.use(after)

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
