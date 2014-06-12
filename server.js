var WebSocketServer = require('websocket').server;
var http = require('http');
var monome = require('monode')();
var device = null;
var connection = null;

monome.on('connect', function(adevice) {
  device = adevice;
});


var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
});
server.listen(1337, function() { });

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});


// WebSocket server
wsServer.on('request', function(request) {
    connection = request.accept(null, request.origin);
    console.log("connected");

    var animation_start = Date.now();

    function iteration() {
      if (Date.now() - animation_start > 500) {
        console.log("end");
        device.osc.send(device.prefix + '/grid/led/all', 0);
        return;
      }
      for (var i = 0; i < 10; i++) {
        device.level(Math.floor(Math.random() * device.width), Math.floor(Math.random() * device.height), Math.floor(Math.random() * 15));
      }
      setTimeout(iteration, 10);
    }

    setTimeout(iteration, 10);

    device.on('key', function(x, y, i) {
      console.log("key !");
      if (connection) {
        connection.sendUTF(JSON.stringify({x:x, y:y,i:i}));
      } else {
        console.log("nobody connected");
      }
    });


    connection.on('message', function(message) {
      console.log("message");
      if (message.type === 'utf8') {
        console.log('Received Message: ' + message.utf8Data);
        var frame = JSON.parse(message.utf8Data);
        device.led(frame.x, frame.y, frame.i);
      } else if (message.type === 'binary') {
        console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
        connection.sendBytes(message.binaryData);
      } else {
        console.log("unex");
      }
    });

    connection.on('close', function(connection) {
      device.removeAllListeners("key");
      console.log("close");
    });
})
