// init express
var express = require('express')
var app = express()

// init discogs client
var Discogs = require('disconnect').Client
var db = new Discogs('ExplorerDiscogsApi/0.0.0').database()

// init redis cache
const redis = require('redis')
var {REDIS_URL} = process.env
if (REDIS_URL === undefined) {  
  console.error("Please set the COMPOSE_REDIS_URL environment variable");
  process.exit(1);
}
let redisClient = redis.createClient(REDIS_URL)

// express cache middleware function
// function cache(req, res, next) {
//     const id = req.params.id;
//     redisClient.get(`release_${id}`, function (err, data) {
//         if (err) throw err;

//         if (data != null) {
//             res.send(respond(org, data));
//         } else {
//             next();
//         }
//     });
// }

// index route
app.get('/', function (request, response) {
  response.send({msg: 'discogs proxy api'})
})

app.get('/releases/:id', async (req, res) => {
  res.send(req.params)
  // const key = `release_${req.params.id}`
  // redisClient.get(key, (err, result) => {
  //   if (err)
  // })
  // db.getRelease(req.params.id, function(err, data) {
  //   console.log(data)
  //   res.send(data)
  // })
})

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})
