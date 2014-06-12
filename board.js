// TODO : pick window for each line to span
// TODO : load new samples dynamically

var ui = {
  width: 20,  //button size
  height: 20, //button size
  padding: 3,
  color_down: 'rgb(255, 184, 0)',
  color_up: 'rgb(179, 171, 153)'
}

var chart = d3.select(".chart")
  .attr("width", 800)
  .attr("height", 500);

// ================ board data
var board_data = [];
for (var x = 0; x < 16; ++x) {
  for (var y = 0; y < 8; ++y) {
    board_data.push({ x: x, y: y, i: 0});
  }
}

function update_board_lights(d){
  chart.selectAll('[data-x="' + d.x + '"][data-y="' + d.y + '"]').style("fill", (d.i) ? ui.color_down : ui.color_up)
}

// ============== sample data

var active_samples = [];
lines.forEach(function(sample, i){ 
  active_samples.push({
    name: sample.url,
    button: i,
    sampleIndex: i
  })
})

var waiting_samples = [];
for (var i = 8; i < samples.length; ++i) {
  waiting_samples.push({
    name: samples[i],
    sampleIndex: i
  })
}

function update_sample(index, sample) {
  chart.selectAll('[data-sample="' + index + '"] text').text(sample.url + " : " + Math.round(sample.audio_buffer.duration * 1000) + "ms")
  chart.selectAll('[data-sample="' + index + '"] rect').attr("width", time(sample.audio_buffer.duration))
}

// ========== user interaction state/data

var mouseDown = 0;
document.body.onmousedown = function() { 
  ++mouseDown;
}
document.body.onmouseup = function() {
  --mouseDown;
}

var currentKeyCode = null;
$('body').keypress(function(e){
  if (e.keyCode == 13) { // enter
    console.log("got enter.");
    load_cut_sample(dragstate.down.x / selection.width, dragstate.up.x / selection.width);
    return;
  }
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', false)
  currentKeyCode = e.charCode;
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', true)
});

// ======== Rendering the board lights

var board = chart.selectAll("g")
  .data(board_data)
  .enter().append("g")
  .attr("transform", function(d, i) { 
    d.index = i;
    return "translate(" + (d.x * (ui.width + ui.padding)) + "," + (d.y * (ui.height + ui.padding)) + ")";
  });

board.append("rect")
  .attr("class", "board-button")
  .attr("data-index", function(d) { return d.index })
  .attr("data-x", function(d) { return d.x })
  .attr("data-y", function(d) { return d.y })
  .attr("width", ui.width)
  .attr("x", 0)
  .attr("y", 0)
  .attr("height", ui.height)
  .style("fill", function(d) {
    return ui.color_up
  })
  .style("opacity", function(d) {
    return 0.5
  });

$('.board-button').mouseover(function(e){
  var b = $(e.currentTarget)
  data = { x: b.data('x'), y: b.data('y'), i: (mouseDown) ? 1 : 0 }
  device.receive({ data: JSON.stringify(data)});
  update_board_lights(data)
})

$('.board-button').mousedown(function(e){
  var b = $(e.currentTarget)
  data = { x: b.data('x'), y: b.data('y'), i: 1 }
  device.receive({ data: JSON.stringify(data)});
  update_board_lights(data)
})

$('.board-button').mouseout(function(e){
  var b = $(e.currentTarget)
  data = { x: b.data('x'), y: b.data('y'), i: 0 }
  device.receive({ data: JSON.stringify(data)});
  update_board_lights(data)
})
$('.board-button').mouseup(function(e){
  var b = $(e.currentTarget)
  data = { x: b.data('x'), y: b.data('y'), i: 0 }
  device.receive({ data: JSON.stringify(data)});
  update_board_lights(data)
})

// ======= Render the samples

function prep_active_sample_for_removal(sample) {
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', false)
  currentKeyCode = (sample.sampleIndex+1).toString().charCodeAt(0)
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', true)
  console.log(currentKeyCode);
}
function handle_sample_swap_click(sample) {
  for (var i = 0; i < 8; ++i) {
    if ( (i+1).toString().charCodeAt(0) == currentKeyCode) {
      switchSample(i, sample.sampleIndex);
      return;
    }
  }
  load_in_editor(sample);
}

var dragstate = {
  down: {x: 0, y: 0},
  up: {x: 0, y: 0},
  dragging: false,
  moved: false,
  ctx: null
};

var editor = {
  buffer: null,
  sample: "",
}

function load_in_editor(sample) {
  getFile(sample.name, function(data) {
    editor.buffer = data;
    editor.sample = sample;
    var factor = data.length / window.innerWidth;
    console.log(data.length, window.innerWidth, factor);
    selection.width = cvs.width = data.length / factor;
    selection.height = cvs.height = 256;
    // var box = cvs.getBoundingClientRect();
    // selection.style.top = box.top + "px";
    // selection.style.left = box.left + "px";
    var c = cvs.getContext("2d");
    var b = data.getChannelData(0);
    c.fillStyle = "#000";
    function rms(buf, offset, len) {
      var rms = 0;
      if (buf.length < offset + len) {
        len = buf.length - offset;
      }
      if (len == 0) {
        return 0;
      }
      for (var i = 0; i < len; i++) {
        var v = buf[offset + i];
        rms += Math.sqrt(v * v);
      }
      rms /= len;
      return rms;
    }
    var j = 0;
    for (var i = 0; i < b.length; i=Math.floor(i+factor)) {
      var rmsvalue = rms(b, i, factor) * 256;
      rmsvalue = Math.max(1.0, rmsvalue);
      c.fillRect(j, cvs.height / 2, 1, -rmsvalue);
      c.fillRect(j++, cvs.height / 2, 1, +rmsvalue);
    }
  });
}

window.onload = function() {
cvs = document.querySelector("#preview");
selection = document.querySelector("#selection");

selection.addEventListener("mousedown", function(e) {
  console.log("down");
  dragstate.dragging = true;
  dragstate.down = {x: e.layerX, y: e.layerY};
});

selection.addEventListener("mouseup", function(e) {
  console.log("up")
  dragstate.dragging = false;
  if (!dragstate.moved) {
    return;
  }
  dragstate.up = {x: e.layerX, y: e.layerY};
});

selection.addEventListener("mousemove", function(e) {
  console.log("move")
  if (!dragstate.dragging) {
    return;
  }
  if (!dragstate.ctx) {
    dragstate.ctx = selection.getContext("2d");
  }
  dragstate.ctx.clearRect(0, 0, selection.width, selection.height);
  dragstate.ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
  console.log(e);
  dragstate.ctx.fillRect(dragstate.down.x, 0, e.layerX - dragstate.down.x, selection.height);
  dragstate.moved = true;
});
}

function load_cut_sample(start, end) {
  var offset_s = start * editor.buffer.duration;
  var end_s = end * editor.buffer.duration;
  if (offset_s > end_s) {
    var tmp = offset_s;
    offset_s = end_s;
    end_s = tmp;
  }
  console.log("frames: " +(end_s - offset_s) * ctx.sampleRate);
  var buf = ctx.createBuffer(1, (end_s - offset_s) * ctx.sampleRate, ctx.sampleRate);
  var channel = buf.getChannelData(0);
  var start_frames = Math.floor(offset_s * ctx.sampleRate);
  var end_frames = Math.floor(end_s * ctx.sampleRate);
  var ed_buffer = editor.buffer.getChannelData(0);

  for (var i = 0; start_frames++ < end_frames; i++) {
    channel[i] = ed_buffer[start_frames];
  }

  var s = {
    name: "cut sample",
    sampleIndex: samples.length,
    buffer: buf
  };

  waiting_samples.push(s);
  samples.push(s);

  update_waiting();

  for (var i = 0; i < 8; ++i) {
    console.log((i+1).toString().charCodeAt(0), currentKeyCode);
    if ( (i+1).toString().charCodeAt(0) == currentKeyCode) {
      switchSample(i, s.sampleIndex);
    }
  }
}

var blobs = chart.selectAll('.active-sample')
  .data(active_samples)
  .enter().append("g")
  .on("click", prep_active_sample_for_removal)
  .attr("class", "active-sample")
  .attr("data-sample", function(d) { return d.sampleIndex })
  .attr("transform", function(d, i) { 
    return "translate("+ (17 * (ui.width + ui.padding)) +", " + i * (ui.height + ui.padding) + ")";
  });

var time = d3.scale.linear().domain([0, 20]).range([100, 350]);

blobs.append("rect")
  .attr("class", function(d, i) {
    return "keyed-" + (i+1).toString().charCodeAt(0)
  })
  .attr("width", 300)
  .attr("x", 0)
  .attr("y", 0)
  .attr("height", ui.height)
blobs.append("text")
  .on("click", prep_active_sample_for_removal)
  .text(function(s){ return s.name })
  .attr("height", ui.height + ui.padding)
  .attr("dy", "1em")

function update_waiting() {
  var blobs = chart.selectAll('.waiting-sample')
    .data(waiting_samples)
    .enter().append("g")
    .attr("data-sample", function(d) { return d.sampleIndex })
    .attr("class", "waiting-sample")
    .attr("transform", function(d, i) { 
      return "translate(0, " + (i + 9) * (ui.height + ui.padding) + ")";
    });

  blobs.append("rect")
    .attr("width", 300)
    .attr("x", 0)
    .attr("y", 0)
    .attr("height", ui.height)
    .on("click", handle_sample_swap_click)
  blobs.append("text")
    .text(function(s){ return s.name })
    .on("click", handle_sample_swap_click)
    .attr("height", ui.height + ui.padding)
    .attr("dy", "1em")
}

update_waiting();
