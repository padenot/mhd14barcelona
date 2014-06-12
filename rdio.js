R.ready(function() {
  $('.sign-in').show();
  console.warn("REBECCA: just got ready");
  if (R.authenticated()) {
    $('.authed').show();
    $('.sign-in').hide();
  } else {
    $('.sign-in').click(function() {
      console.warn("REBECCA: sign in clicked");
      R.authenticate(function(nowAuthenticated) {
        console.warn("REBECCA: jheard back from Rdio : "+nowAuthenticated);
        if (nowAuthenticated) {
          $('.authed').show();
          $('.sign-in').hide();
        }
      });
    });
  }

  R.player.on("change:position", function(sec) {
    if (!rdioSample.running) {
      rdioSample.loaded();
    }
  })
});
function RdioSample(track_id, line, device, loaded_cb) {
  this.url = 'rdio ' + track_id
  this.track_id = track_id;
  this.current_button = 0;
  this.line = line;
  this.device = device;
  this.loaded_cb = loaded_cb;
  this.running = false;
  this.begin = 10;
  this.end = this.begin + 16;
}

RdioSample.prototype.init = function() {
  console.log("REB>> Initi")
  R.player.volume(0);
  R.player.repeat(R.player.REPEAT_ONE);
  R.player.play({ source: this.track_id, initialPosition: this.begin });
}

RdioSample.prototype.loaded = function(data) {
  console.log("REB>> Loaded")
  this.running = true;
  this.loaded_cb();
  R.player.togglePause();
}

RdioSample.prototype.stop = function() {
  console.log("REB>> Stop")
  R.player.togglePause();
  clearInterval(this.progress_itv)
  var off = {x: this.current_button, y: this.line, i:0};
  this.device.send(off);
}

// index between 0 and 15
RdioSample.prototype.trigger = function(index_left, index_right) {
  console.log("REB>> Trigger")
  if (index_left < 0 && index_left > 15) {
    throw "bad left index";
  }
  if (index_right < 0 && index_right > 15) {
    throw "bad right index";
  }
  R.player.volume(0.2);
  if (R.player.playState() == R.player.PLAYSTATE_PLAYING) {
    clearInterval(this.progress_itv)
    // turn the led off;
    var off = {x: this.current_button, y: this.line, i:0};
    this.device.send(off);
  } else {
    R.player.togglePause();
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

  var duration = this.end - this.begin; //R.player.playingTrack().get('duration');
  this.button_length = duration / 16;
  var offset_seconds = this.begin + index_left * this.button_length;

  console.log(" Button length : "+this.button_length+ " (from : duration- "+duration+" == from "+this.begin+" to "+this.end);
  R.player.position(offset_seconds)
  this.progress_itv = setInterval(this.progress.bind(this), this.button_length * 1000);
}

RdioSample.prototype.progress = function() {
  console.log("REB>> Progress ", this.current_button)
  var off = {x: this.current_button, y: this.line, i:0};
  this.device.send(off);

  this.current_button++;
  if (this.current_button >= this.index_right) {
    this.current_button = this.index_left;
    var offset_seconds = this.begin + this.index_left * this.button_length;
    R.player.position(offset_seconds);
  }

  // turn the led on
  var on = {x: this.current_button, y: this.line, i:1};
  this.device.send(on);
}
RdioSample.prototype.display_name = function() {
  return R.player.playingTrack().get('name') + " : "+ this.duration_ms()/1000 + "s"
}
RdioSample.prototype.duration_ms = function() {
  return (this.end - this.begin) * 1000;
}

rdioSample = null
$('.load-track').click(function() {
  console.log("Rebecca, are we going to play this ",  $('.track-id').val() )
  rdioSample = new RdioSample($('.track-id').val(), 7, device, function() {
    console.log("REBECCA: updating THE SAMPLE")
    update_sample(7, rdioSample);
  });
  rdioSample.init();
  lines[7] = rdioSample;
})