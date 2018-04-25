// Start express.js
const express = require('express')
const app = express()


// Start Discogs API client
const Discogs = require('disconnect').Client
const db = new Discogs('ExplorerDiscogsApi/0.0.0').database()

// Start redis cache + custom before/after middleware.
const {redis, before, after} = require('./redis-cache')

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

app.get('/masters/:id', async (req, res, next) => {
  const data = await db.getLabel(req.params.id)
  res.locals.cache = data // store data so we can access in 'after' middleware
  res.send(data)
  next()
})

app.use(after)

const listener = app.listen(process.env.PORT, function() {
	console.log(`Your app is listening on port ${listener.address().port}`)
})
