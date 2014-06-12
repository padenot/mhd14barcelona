

var WebSocketServer = require('websocket').server;
var http = require('http');
var monome = require('monode')();
var device = null;
var connection = null;
var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs")
    port = process.argv[2] || 8888;

monome.on('connect', function(adevice) {
  device = adevice;
});


var server = http.createServer(function(request, response) {
  console.log("sup yo")
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);
  console.log(" : "+uri)
  path.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }
 
    if (fs.statSync(filename).isDirectory()) filename += '/index.html';
 
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }
 
      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    });
  });
}).listen(parseInt(port, 10));
 

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});


// WebSocket server
wsServer.on('request', function(request) {
    if (!device) {
      return;
    }
    connection = request.accept('sharks', request.origin);
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

    var state = [-1, -1, -1, -1, -1, -1, -1, -1];
    var prevframe;

    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        // console.log('Received Message: ' + message.utf8Data);
        var frame = JSON.parse(message.utf8Data);
        if (frame.x != undefined) {
          device.led(frame.x, frame.y, frame.i);
          state[frame.y] = frame.x;
        } else {
          if (prevframe) {
            for (var i = 0; i < 16; i++) {
              for (var j = 0; j < prevframe[i]; j++) {
                device.led(i, 7 - j, 0);
              }
            }
          }
          for (var i = 0; i < 16; i++) {
            for (var j = 0; j < frame[i]; j++) {
              device.level(i, 7 - j, 4);
            }
          }
          prevframe = frame;
          for (var i = 0; i < 8; i++) {
            if (state[i] != -1) {
              device.led(i, state[i], 1);
            }
          }
        }
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



 

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");