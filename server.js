// Start express.js
const express = require('express')
const cors = require('cors')
const app = express()

// Allow cross-origin requests
app.use(cors())

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
const CACHE_SECONDS = 86400 // 24 hours

if (REDIS_URL === undefined) {
	console.error('Please set the REDIS_URL environment variable')
	process.exit(1)
}

// Connect with SSL
// const redis = new Redis(REDIS_URL, {
// 	tls: { servername: new URL(REDIS_URL).hostname }
// })
const redis = new Redis(REDIS_URL)

// Listen to events from redis
redis.on('error', err => console.log('redis err', err))
redis.on('connect', () => console.log('connected to redis'))
redis.on('end', () => console.log('disconnected from redis'))


// Express middleware for caching
async function cache(req, res, next) {
  const key = req.originalUrl
  
  res.sendResponse = res.json
  
  // If cache exists return it
	let cache = await redis.get(key)
	if (cache) {
	  console.log(`using cache for "${key}"`, typeof cache)
	  res.sendResponse(cache)
	  return
	}
  
  // …otherwise overwrite "res.json" to allow saving cache before sending response  
  res.sendResponse = res.json
  res.json = (body) => {
    console.log(`no cache found for "${key}". creating cache`, body.status)
    redis.set(key, JSON.stringify(body), 'EX', CACHE_SECONDS)
    res.sendResponse(body)
  }
  
  next()
}

app.get('/', (req, res) => {
  res.json({
    'test release': `https://${req.headers.host}/releases/6980600`,
    'test label': `https://${req.headers.host}/labels/840950`,
    'test master': `https://${req.headers.host}/masters/74177`,
    'test search': `https://${req.headers.host}/database/search?page=10&per_page=5&q=nirvana`,
    help: 'https://glitch.com/edit/#!/edapi'
  })
})

app.get('/releases/:id', cache, async (req, res) => {
  const data = await db.getRelease(req.params.id)
  res.json(data)
})

app.get('/labels/:id', cache, async (req, res) => {
  const data = await db.getLabel(req.params.id)
  res.json(data)
})

app.get('/masters/:id', cache, async (req, res) => {
  const data = await db.getMaster(req.params.id)
  res.json(data)
})

app.get('/artists/:id', cache, async (req, res) => {
  const data = await db.getArtist(req.params.id)
  res.json(data)
})

app.get('/artists/:id/releases', cache, async (req, res) => {
  const data = await db.getArtistReleases(req.params.id)
  res.json(data)
})

app.get('/database/search', cache, async (req, res) => {
  const data = await db.search(req.params.search)
  res.json(data)
})

app.get('/labels/:id/releases', cache, async (req, res) => {
  const data = await db.getLabelReleases(req.params.id)
  res.json(data)
})

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
