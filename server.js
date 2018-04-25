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

app.get('/', function(request, response) {
	response.send({ msg: 'discogs proxy api' })
})

app.get('/releases/:id', (req, res) => {
	const id = req.params.id
	db.getRelease(id, (err, data) => {
    res.send(data)
  })
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

var listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
