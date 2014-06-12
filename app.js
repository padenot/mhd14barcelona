var connection = new WebSocket('ws://127.0.0.1:1337');

connection.onopen = function () {
    // connection is opened and ready to use
   console.log("open")
};

connection.onerror = function (error) {
  connection.close();
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
  this.buffer_source = null;
  this.audio_buffer = null;
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

Sample.prototype.stop = function() {
  if (this.buffer_source) {
    this.buffer_source.stop(0);
    this.buffer_source = null;
    clearInterval(this.progress_itv)
    var off = {x: this.current_button, y: this.line, i:0};
    this.device.send(off);
  }
}

// index between 0 and 15
Sample.prototype.trigger = function(index) {
  if (index < 0 && index > 15) {
    throw "bad index";
  }
  if (this.buffer_source) {
    this.buffer_source.stop(0);
    clearInterval(this.progress_itv)
    this.progress_itv = null;
    // turn the led off;
    var off = {x: this.current_button, y: this.line, i:0};
    this.device.send(off);
  }
  // set the current button.
  this.current_button = index;
  // light the right led
  var on = {x: this.current_button, y: this.line, i:1};
  this.device.send(on);

  this.buffer_source = this.sink.context.createBufferSource();
  this.buffer_source.buffer = this.audio_buffer;
  this.buffer_source.loop = true;
  var button_length = this.audio_buffer.duration / 16;
  var offset_seconds = index * button_length;
  this.buffer_source.start(0, offset_seconds, this.audio_buffer.duration)
  this.progress_itv = setInterval(this.progress.bind(this), button_length * 1000);
  this.buffer_source.connect(this.sink);
}

Sample.prototype.progress = function() {
  // turn the led off;
  var off = {x: this.current_button, y: this.line, i:0};
  this.device.send(off);

  this.current_button = (this.current_button + 1) % 16;

  // turn the led on
  var on = {x: this.current_button, y: this.line, i:1};
  this.device.send(on);
}

function Device(connection) {
  this.connection = connection;
  if (this.connection) {
    connection.onmessage = this.receive; 
  }
}

Device.prototype.send = function(data) {
  if (this.connection) {
    connection.send(JSON.stringify(data));
  }
  updateUi(data);
}

Device.prototype.receive = function(message) {
  var obj = JSON.parse(message.data);
  // ignore button release events
  if (obj.i == 0) {
    return;
  }
  // sample not loaded on this line
  if (!lines[obj.y]) {
    return;
  }
  lines[obj.y].trigger(obj.x);
  updateUi(obj);
}

var ctx = new AudioContext();
var device = new Device(connection);
var lines  = [];
var samples = [
"P5mlrDRUMS.ogg",
"P5mlrVOICE2.ogg",
"P5mlrARPCHORD.ogg",
"P5mlrARP.ogg",
"P5mlrCHORDs.ogg",
"P5mlrDUB.ogg",
"P5mlrGTR1.ogg",
"P5mlrGTR2.ogg",
"P5mlrGTR3.ogg",
"P5mlrGTrSTr.ogg",
"P5mlrHARD1.ogg",
"P5mlrHARD2.ogg",
"P5mlrHARDDUB.ogg",
"P5mlrSTRINGS.ogg",
"P5mlrVOICE.ogg",
];
var sample_dir = "samples/"

var analyser = ctx.createAnalyser();
analyser.connect(ctx.destination);
analyser.fftSize = 32;
var array = new Uint8Array(analyser.frequencyBinCount);

function render() {
  analyser.getByteFrequencyData(array);
  for (var i = 0 ; i < analyser.frequencyBinCount; i++) {
    array[i] /= 32;
  }
  lines[0].device.send(array);
  setTimeout(render, 1000 / 24);
}


// load the first 8 samples
for (var i = 0; i < 8; i++) {
  lines[i] = new Sample(analyser, sample_dir + samples[i], i, device, function() {
    console.log("loaded ", samples[i]);
  });
}

for (var i in lines) {
  lines[i].init();
}

// keyboard
window.addEventListener("keyup", function(e) {
  if (e.keyCode >= 49 && e.keyCode <= 48 + 8) {
    var l = e.keyCode - 49;
    lines[l].stop();
  }
  if (e.keyCode == 48 + 8 + 1) {
    render();
  }
});
