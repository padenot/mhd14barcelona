var connection = new WebSocket('ws://127.0.0.1:8888', 'sharks');

connection.onopen = function () {
    // connection is opened and ready to use
   console.log("open")
   device.connection_valid = true
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
  if (url instanceof AudioBuffer) {
    this.url = ""
    this.audio_buffer = url;
  } else {
    this.url = url;
    this.audio_buffer = null;
  }
  this.buffer_source = null;
  this.sink = sink;
  this.current_button = 0;
  this.line = line;
  this.device = device;
  this.loaded_cb = loaded_cb;
  if (url instanceof AudioBuffer) {
    this.loaded_cb();
  }
}

Sample.prototype.init = function() {
  if (!this.audio_buffer) {
    getFile(this.url, this.loaded.bind(this));
  }
}

Sample.prototype.loaded = function(data) {
  this.audio_buffer = data;
  this.loaded_cb();
}

Sample.prototype.stop = function() {
  console.log("Called stop on "+this.display_name())
  if (this.buffer_source) {
    this.buffer_source.stop(0);
    this.buffer_source = null;
  }
  clearInterval(this.progress_itv)
  var off = {x: this.current_button, y: this.line, i:0};
  this.device.send(off);
}

// index between 0 and 15
Sample.prototype.trigger = function(index_left, index_right) {
  if (index_left < 0 && index_left > 15) {
    throw "bad left index";
  }
  if (index_right < 0 && index_right > 15) {
    throw "bad right index";
  }
  if (this.buffer_source) {
    this.buffer_source.stop(0);
    clearInterval(this.progress_itv)
    this.progress_itv = null;
    // turn the led off;
    var off = {x: this.current_button, y: this.line, i:0};
    this.device.send(off);
  }

  // If we are not looping, start is the 0s
  this.index_left = index_right ? index_left : 0;

  // If we are not looping, end is the last button
  if (index_right == undefined) {
    this.index_right = 16;
  } else{
    this.index_right = index_right + 1;
  }

  // set the current button.
  this.current_button = index_left;
  // light the right led
  var on = {x: this.current_button, y: this.line, i:1};
  this.device.send(on);

  this.buffer_source = this.sink.context.createBufferSource();
  this.buffer_source.buffer = this.audio_buffer;
  this.buffer_source.loop = true;

  var button_length = this.audio_buffer.duration / 16;
  var offset_seconds = index_left * button_length;

  this.buffer_source.start(0, offset_seconds, this.audio_buffer.duration)

  if (this.index_right != undefined) {
    this.buffer_source.loopStart = offset_seconds
    this.buffer_source.loopEnd = this.index_right * button_length;
  } else {
    this.buffer_source.loopStart = 0
    this.buffer_source.loopEnd = this.audio_buffer.duration;
  }

  this.progress_itv = setInterval(this.progress.bind(this), button_length * 1000);
  this.buffer_source.connect(this.sink);
}

Sample.prototype.progress = function() {
  // turn the led off;
  var off = {x: this.current_button, y: this.line, i:0};
  this.device.send(off);

  this.current_button++;
  if (this.current_button >= this.index_right) {
    this.current_button = this.index_left;
  }

  // turn the led on
  var on = {x: this.current_button, y: this.line, i:1};
  this.device.send(on);
}
Sample.prototype.display_name = function() {
  var duration_s = Math.round(this.audio_buffer.duration * 1000);
  if (!this.url) {
    return "cut sample " + duration_s;
  }
  return this.url + ":" +  duration_s + "ms";
}
Sample.prototype.duration_s = function() {
  return this.audio_buffer.duration;
}

function Device(connection) {
  this.connection_valid = false;
  this.connection = connection;
  if (this.connection) {
    this.connection.onmessage = this.receive.bind(this); 
  }
  // bidimensional array of buttons
  this.down = [];
  for (var i = 0; i < 8; i++) {
    this.down[i] = [];
  }
}

Device.prototype.send = function(data) {
  if (this.connection && this.connection_valid) {
    this.connection.send(JSON.stringify(data));
  }
  update_board_lights(data);
}

Device.prototype.receive = function(message) {
  var obj = JSON.parse(message.data);
  if (obj.i == 1) {
    this.down[obj.y].push(obj.x);
    return;
  }
  // sample not loaded on this line
  if (!lines[obj.y]) {
    return;
  }
  if (this.down[obj.y].length > 1) {
    this.down[obj.y] = this.down[obj.y].sort();
    lines[obj.y].trigger(this.down[obj.y][0], this.down[obj.y][this.down[obj.y].length - 1]);
    this.down[obj.y] = [];
  } else {
    if (this.down[obj.y].length == 0) {
      return;
    }
    lines[obj.y].trigger(obj.x);
    this.down[obj.y] = [];
  }
  if (old_lines[obj.y]) {
    old_lines[obj.y].stop();
    old_lines[obj.y] = null;
  }
  update_board_lights(obj);
}

var ctx = new AudioContext();
var device = new Device(connection);
var lines  = [];
// old_lines tracks samples that have been switched out but haven't been killed yet via a trigger
var old_lines = [];
var samples = [
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
"P5mlrDRUMS.ogg",
];
var sample_dir = "samples/"
samples = samples.map(function(url) { return sample_dir + url })

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
  old_lines[i] = null;
  lines[i] = new Sample(analyser, samples[i], i, device, function() {
    console.log("loaded ", samples[i]);
    update_sample(this.line, this)
  });
}

for (var i in lines) {
  lines[i].init();
}

function switchSample(lineIndex, sampleIndex) {
  console.log("Siwtching current ["+lineIndex+"] with waiting ["+sampleIndex+"]")
  if (!old_lines[lineIndex]) {
    old_lines[lineIndex] = lines[lineIndex]
  }
  if (samples[sampleIndex].buffer) {
    lines[lineIndex] = new Sample(analyser, samples[sampleIndex].buffer, lineIndex, device, function() {
      update_sample(this.line, this);

      samples[sampleIndex] = old_lines[lineIndex].url

      update_sample(sampleIndex, old_lines[lineIndex]);
    });
  } else {
    lines[lineIndex] = new Sample(analyser, samples[sampleIndex], lineIndex, device, function() {
      console.log("loaded ", samples[sampleIndex]);
      update_sample(this.line, this);

      samples[sampleIndex] = old_lines[lineIndex].url
      update_sample(sampleIndex, old_lines[lineIndex])
    });
    lines[lineIndex].init();
  }
  remove_key_selection();
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
  if (e.keyCode == 48) {
    lines.forEach(function(l){ l.stop() });
    old_lines.forEach(function(l){ if (l) l.stop() });
  }
});

