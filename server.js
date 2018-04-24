// init express
var express = require('express')
var app = express()

// init discogs client
var Discogs = require('disconnect').Client
var db = new Discogs('ExplorerDiscogsApi/0.0.0').database()

// init redis cache
const Redis = require('ioredis')
const {URL} = require('url')
var { REDIS_URL } = process.env
if (REDIS_URL === undefined) {
	console.error('Please set the REDIS_URL environment variable')
	process.exit(1)
}
const redis = new Redis(REDIS_URL, {
  tls: { servername: new URL(REDIS_URL).hostname }
})

redis.on('error', (err) => {
  console.log(err)
})

// index route
app.get('/', function(request, response) {
	response.send({ msg: 'discogs proxy api' })
})

app.get('/releases/:id', (req, res) => {
	const id = req.params.id
	const key = `releases/${id}`
  
  console.log({id, key})
  
  redis.get(key, function (err, result) {
    if (err) {
      console.error(err)
    } else {
      console.log(result)
    }
  })
  
  db.getRelease(id, (err, data) => {
		console.log('setting cache', key, data)
    redis.set(key, 3600, 'EX', data)
		res.send(data)
	})

	// return redis
	// 	.get(key)
	// 	.then((result) => {
	// 		console.log(`found cache`, result)
	// 		res.send(result)
	// 	})
	// 	.catch(() => {
	// 		console.log('no cache')
	// 		db.getRelease(id, function(err, data) {
	// 			redis.set(key, 3600, 'EX', data)
	// 			console.log('setting cache', key)
	// 			res.send(data)
	// 		})
	// 	})
})

var listener = app.listen(process.env.PORT, function() {
	console.log('Your app is listening on port ' + listener.address().port)
})
