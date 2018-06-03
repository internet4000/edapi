// Start express.js
const express = require('express')
const cors = require('cors')
const app = express()
const compression = require('compression')

// Compress all responses
app.use(compression())

// Allow cross-origin requests
app.use(cors())

// … at the end of this file we do error handling.



// Start Discogs API client
const DiscogsClient = require('disconnect').Client
const client = new DiscogsClient('ExplorerDiscogsApi/0.0.0', {
	consumerKey: process.env.DISCOGS_KEY, 
	consumerSecret: process.env.DISCOGS_SECRET
}).setConfig({outputFormat: 'html'})

const db = client.database()



// Start cache with redis
const Redis = require('ioredis')
const { URL } = require('url')
const { REDIS_URL } = process.env
const HOUR = 3600
const CACHE_SECONDS = HOUR * 48

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
  
  // If cache exists return it
	let cache = await redis.get(key)
  if (cache) {
    console.log(`using cache for "${key}"`, typeof cache)
    res.json(JSON.parse(cache))
    return
  }
  
  // …otherwise overwrite "res.send" to allow saving cache before sending response
  res.sendResponse = res.send
  res.send = (body) => {
    console.log(`no cache found for "${key}". creating cache`)
    redis.set(key, body, 'EX', CACHE_SECONDS)
    res.sendResponse(body)
  }
  
  // continue route-specific handler
  next()
}

let wrap = fn => (...args) => fn(...args).catch(args[2])

app.get('/', (req, res) => {
  res.send({
    'test release': `https://${req.headers.host}/releases/6980600`,
    'test label': `https://${req.headers.host}/labels/840950`,
    'test master': `https://${req.headers.host}/masters/74177`,
    'test search': `https://${req.headers.host}/database/search?page=10&per_page=5&q=nirvana`,
    help: 'https://glitch.com/edit/#!/edapi'
  })
})

app.get('/releases/:id', cache, async (req, res, next) => {
  try {
    const data = await db.getRelease(req.params.id)
    res.send(data)
  } catch(err) {
    next(err)
  }
})

app.get('/labels/:id', cache, wrap(async (req, res) => {
  const data = await db.getLabel(req.params.id)
  res.send(data)
}))

app.get('/masters/:id', cache, wrap(async (req, res) => {
  const data = await db.getMaster(req.params.id)
  res.send(data)
}))

app.get('/artists/:id', cache, wrap(async (req, res) => {
  const data = await db.getArtist(req.params.id)
  res.send(data)
}))

app.get('/database/search', wrap(async (req, res) => {
  console.log(req.params, req.query)
  const data = await db.search(req.query.q, req.query)
  res.send(data)
}))

app.get('/labels/:id/releases', cache, wrap(async (req, res) => {
  const data = await db.getLabelReleases(req.params.id, req.query)
  res.send(data)
}))

app.get('/artists/:id/releases', cache, wrap(async (req, res) => {
  const data = await db.getArtistReleases(req.params.id, req.query)
  res.send(data)
}))

function errorHandler (err, req, res, next) {
  // console.log(err.statusCode, err.message)
  res.status(err.statusCode).json({
    errors: {
      msg: err.message
    }
  })
}

app.use(errorHandler)

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
