// init express
var express = require('express')
var app = express()

// init discogs client
var Discogs = require('disconnect').Client
var db = new Discogs('ExplorerDiscogsApi/0.0.0').database()

// index route
app.get('/', function (request, response) {
  response.send({msg: 'discogs proxy api'})
})

app.get('/releases/:id', async (req, res) => {
  db.getRelease(req.params.id, function(err, data){
    console.log(data)
    res.send(data)
  })
})

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})
