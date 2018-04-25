// init express
const express = require('express')
const app = express()

// init discogs client
const Discogs = require('disconnect').Client
const db = new Discogs('ExplorerDiscogsApi/0.0.0').database()

// init redis cache
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

const oskar = async (req, res, next) => {
  const id = req.params.id
  const key = req.originalUrl
  
  console.log('middleware before', req.originalUrl)
  
  let cache = await redis.get(key)
  if (cache) {
    console.log('we have a cache')
  }
  
  await next()
  
  console.log('middleware after?', res.locals)
  
  if (res.locals.cache) {
    console.log('setting cache', key)
		redis.set(key, JSON.stringify(res.locals.cache), 'EX', CACHE_SECONDS)
  }
}

app.get('/', function(request, response) {
  response.send({ msg: 'discogs proxy api', test: })
})

app.get('/releases/:id', oskar, async (req, res, next) => {
  console.log('before')
	let data = await db.getRelease(req.params.id)
  res.locals.cache = data
  res.send(data)
  console.log('after')
  res.end()
})

app.get('/cached-releases/:id', async (req, res) => {
	const id = req.params.id
  const key = req.originalUrl

	console.log({ id, key })

	let cache = await redis.get(key)
	if (cache) {
		console.log('found cache')
		res.send(JSON.parse(cache))
	} else {
		console.log('no cache')
		db.getRelease(id, (err, data) => {
			console.log('setting cache', key)
			redis.set(key, JSON.stringify(data), 'EX', CACHE_SECONDS)
			res.send(data)
		})
	}
})

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
