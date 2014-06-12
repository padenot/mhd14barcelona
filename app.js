var connection = new WebSocket('ws://127.0.0.1:1337');

connection.onopen = function () {
    // connection is opened and ready to use
   console.log("open")
};

connection.onerror = function (error) {
  connection.close();
};

connection.onmessage = function (message) {
  var obj = JSON.parse(message.data);
  if (obj.i == 1) {
    s.trigger(obj.x);
  }
  updateUi(obj);
};

window.onbeforeunload = function() {
  console.log("onbeforeunload")
  connection.onclose = function () {}; // disable onclose handler first
  connection.close()
};


function getFile(url, cb) {
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function() {
    ctx.decodeAudioData(request.response, function(data) {
      cb(data);
    }, function() {
      alert("decodeAudioData error");
    });
  };

  request.send();
}

function Sample(sink, url, line, device, loaded_cb) {
  this.url = url;
  this.buffer_source ;
  this.audio_buffer = 
  this.sink = sink;
  this.current_button = 0;
  this.line = line;
  this.device = device;
  this.loaded_cb = loaded_cb;
}

Sample.prototype.init = function() {
  getFile(this.url, this.loaded.bind(this));
}

Sample.prototype.loaded = function(data) {
  this.audio_buffer = data;
  this.loaded_cb();
}

// index between 0 and 15
Sample.prototype.trigger = function(index) {
  if (index < 0 && index > 15) {
    throw "bad index";
  }
  if (this.buffer_source) {
    this.buffer_source.stop(0);
    clearInterval(this.progress_itv)
    this.progress_itv = 0;
    // turn the led off;
    // XXX fix
    var off = {x: this.current_button, y: this.line, i:0};
    connection.send(JSON.stringify(off));
  }
  // set the current button.
  this.current_button = index;
  // light the right led
  var on = {x: this.current_button, y: this.line, i:1};
  connection.send(JSON.stringify(on));

  this.buffer_source = this.sink.context.createBufferSource();
  this.buffer_source.buffer = this.audio_buffer;
  this.buffer_source.loop = true;
  var button_length = this.audio_buffer.duration / 16;
  var offset_seconds = index * button_length;
  console.log(button_length);
  this.buffer_source.start(0, offset_seconds, this.audio_buffer.duration)
  this.progress_itv = setInterval(this.progress.bind(this), button_length * 1000);
  this.buffer_source.connect(this.sink);
}

Sample.prototype.progress = function() {
  // turn the led off;
  // device.led(this.current_button, this.line, 0);
  var off = {x: this.current_button, y: this.line, i:0};
  console.log("Sending OFF : ", off)
  connection.send(JSON.stringify(off));
  this.current_button = (this.current_button + 1) % 16;
  // console.log(this.current_button);
  // turn the led on
  // device.led(this.current_button, this.line, 1);
  var on = {x: this.current_button, y: this.line, i:1};
  console.log("Sending ON : ", on)
  connection.send(JSON.stringify(on));
}

var ctx = new AudioContext();
var device = {};
s = new Sample(ctx.destination, "think-looped-mono.wav", 0, device, function() {
  console.log("loaded");
});

s.init();

