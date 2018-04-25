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
const CACHE_SECONDS = 3600

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


// Express middleware for caching
async function cache(req, res, next) {
  const key = req.originalUrl
  
  // if cache exists, return it
	let cache = await redis.get(key)
  if (cache) {
    console.log(`using cache for "${key}"`)
    res.send(cache)
    return
  }
  
  // otherwise overwrite "res.send" so we can save cache before sending the response
  res.sendResponse = res.send
  res.send = (body) => {
    console.log(`no cache found for "${key}". creating cache`)
    redis.set(key, body, 'EX', CACHE_SECONDS)
    res.sendResponse(body)
  }
  
  next()
}


// Helper to put the readme into the api. not really needed
var fs = require('fs')
const readFile = (path) => {
  var file = fs.readFileSync(__dirname + '/' + path, 'utf8')
  return file.split(/\r?\n/)
}

app.get('/', (req, res) => {
  res.send({
    'test release': `https://${req.headers.host}/releases/6980600`,
    'test label': `https://${req.headers.host}/labels/840950`,
    'test master': `https://${req.headers.host}/masters/74177`,
    help: readFile('README.md')
  })
})

app.get('/releases/:id', cache, async (req, res) => {
  const data = await db.getRelease(req.params.id)
  res.send(data)
})

app.get('/labels/:id', cache, async (req, res) => {
  const data = await db.getLabel(req.params.id)
  res.send(data)
})

app.get('/masters/:id', cache, async (req, res) => {
  const data = await db.getMaster(req.params.id)
  res.send(data)
})

app.get('/artists/:id', cache, async (req, res) => {
  const data = await db.getArtist(req.params.id)
  res.send(data)
})

app.get('/database/search', cache, async (req, res) => {
  const data = await db.search(req.params.search)
  res.send(data)
})

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
