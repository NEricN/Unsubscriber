var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var emailscraper = require('./emailscraper');

app.use(express.static('client/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/client/index.html');
});

io.on('connection', function(socket){
  socket.on('new-email', function(key){
    emailscraper.scrapeAllEmails(key, function(ds, cb) {
        ds.forEach(function(d) {
            if(d.domain && d.from && d.unsubLink) {
                socket.emit('email-found-' + key, d);
            }
        });

        cb(null, function() {
            socket.emit('email-done-' + key, {});
        });
    })
  });

  socket.on('unsubscribe', function(url) {
    // most of the subscriptions only require a single get request
    // TODO: handle the ones that require another click
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    })
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
