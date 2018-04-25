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

redis.on('error', err => console.log('redis err', err))
redis.on('connect', () => console.log('connected to redis'))
redis.on('end', () => console.log('disconnected from redis'))

app.use(function(req, res, next) {
    console.log("before");
    res.on("finish", function() {
        console.log("onFinish");
    });
    next();
});

const oskar = (req, res, next) => {
  const id = req.params.id
  const key = req.originalUrl
  console.log({id, key})
//   console.log('middleware before', req.originalUrl)
//   redis.get(key)
//     .then((result) => {
//       if (result) {
//         console.log('found cache')
//         res.send(JSON.parse(result))
//       } else {
//         console.log('no cache?')
//         next()
//       }
//     })
//     .catch(err => {
//       console.log('no cache')
//       next(err)
//     })
//   if (res.locals.cache) {
// 		// redis.set(key, JSON.stringify(res.locals.cache), 'EX', CACHE_SECONDS)
//   }
}

app.get('/', function(request, response, next) {
  response.send({ msg: 'discogs proxy api', test: 'https://edapi.glitch.me/releases/6980600' })
  next()
})

app.get('/releases/:id', (req, res, next) => {
	db.getRelease(req.params.id)
    .then(data => {res.send(data); next()})
    .then(next)
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

app.use(function(req, res, next) {
  console.log("after")
  next()
});

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
