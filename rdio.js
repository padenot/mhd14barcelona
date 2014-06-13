R.ready(function() {
  $('.rdio').show();
  if (R.authenticated()) {
    postAuth();
  } else {
    $('.sign-in').click(function() {
      R.authenticate(function(nowAuthenticated) {
        if (nowAuthenticated) {
          postAuth();
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

function postAuth() {
  $('.authed').show();
  $('.sign-in').hide();
  $('.welcome').text("Welcome, "+ R.currentUser.get('firstName'));
}
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
  console.log("REB>> Initi "+ this.track_id)
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
  if (this.index_right < this.index_left) {
    console.log("WTF! Correcting some index problems...")
    var temp = this.index_left;
    this.index_left = this.index_right;
    this.index_right = temp;
  }
  if (this.current_button >= this.index_right) {
    console.log(" >> hit the right edge ("+this.index_right+"), bouncing back to ("+this.index_left+")")
    this.current_button = this.index_left;
    var offset_seconds = this.begin + this.index_left * this.button_length;
    R.player.position(offset_seconds);
  }

  // turn the led on
  var on = {x: this.current_button, y: this.line, i:1};
  this.device.send(on);
}
RdioSample.prototype.display_name = function() {
  return R.player.playingTrack().get('name') + " : "+ this.duration_s() + "s"
}
RdioSample.prototype.duration_s = function() {
  return (this.end - this.begin);
}

rdioSample = null
var handle_use_track_click = function(e) {
  var track_id = $(e.currentTarget).data('id')
  if (rdioSample) {
    rdioSample.stop();
  }
  rdioSample = new RdioSample(track_id, 7, device, function() {
    update_sample(7, rdioSample);
  });
  rdioSample.init();
  lines[7] = rdioSample;
}
$('.find-track').click(function() {
  R.request({
    method: 'searchSuggestions',
    content: {
      query: $('.track-id').val(),
      types: 'Track'
    },
    success: function(response) {
      if (!response.result || response.result.length == 0) {
        $('.search-results').html("No results found, please try again...")
      }
      var clunkyHtmlString = ''
      var results = []
      response.result.forEach(function(entry) {
        clunkyHtmlString += "<div class='entry'><img src='"+entry.icon+"'><b>" +
          entry.name +"</b> from "+ entry.album +" by "+entry.artist+" <div class='button track-id' data-id="+ entry.key+">Use</div></div>"
        results.push({
          name: entry.name,
          key: entry.key,
          artist: entry.artist,
          album: entry.album,
          icon: entry.icon
        });
      });
      $('.search-results').html(clunkyHtmlString);
      $('.search-results .track-id').click(handle_use_track_click);
    }
  });
})
$('.expander').click(function() { 
  $('.expander').toggleClass('expanded') 
  $('.rdio').toggleClass('expanded') 
})

