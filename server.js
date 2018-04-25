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

// express routes
app.get('/', (req, res) => {
  res.send({
    msg: 'discogs proxy api',
    test: 'https://edapi.glitch.me/releases/6980600'
  })
})

app.get('/releases/:id', async (req, res) => {
  const key = req.originalUrl

  // return from cache if possible
	let cache = await redis.get(key)
	if (cache) {
    console.log('using cache')
		return res.send(JSON.parse(cache))
	}
  
  // otherwise fetch and store in cache
  console.log('no cache')
  db.getRelease(req.params.id, (err, data) => {
    redis.set(key, JSON.stringify(data), 'EX', CACHE_SECONDS)
    res.send(data)
  })
})

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
