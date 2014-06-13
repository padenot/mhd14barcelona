// TODO : pick window for each line to span
// TODO : load new samples dynamically

var ui = {
  offset_x: 5,
  offset_y: 5,
  width: 30,  //button size
  height: 30, //button size
  sample_width: 350,
  padding: 3
}

var chart = d3.select(".chart")
  .attr("width", (ui.width+ui.padding) * 17 + ui.offset_x + (2*ui.sample_width))
  .attr("height", ((ui.height + ui.padding) * 9 + ui.offset_y));

// ================ board data
var board_data = [];
for (var x = 0; x < 16; ++x) {
  for (var y = 0; y < 8; ++y) {
    board_data.push({ x: x, y: y, i: 0});
  }
}

function update_board_lights(d){
  chart.selectAll('[data-x="' + d.x + '"][data-y="' + d.y + '"]').classed('pressed', d.i);
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
  console.log("I just made something with sample ", waiting_samples[waiting_samples.length-1])
}

function update_sample(index, sample) {
  chart.selectAll('[data-sample="' + index + '"] .display-name').text(sample.display_name());
  chart.selectAll('[data-sample="' + index + '"] .duration').attr("width", time(sample.duration_s()))
}

// ========== user interaction state/data

var mouseDown = false;
document.body.onmousedown = function() { 
  mouseDown = true;
}
document.body.onmouseup = function() {
  mouseDown = false;
}

var currentKeyCode = null;
function remove_key_selection() {
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', false)
  currentKeyCode = null;
}
$('body').keypress(function(e){
  console.log("e.keyCode "+e.keyCode)
  if (e.keyCode == 13) { // enter
    load_cut_sample(dragstate.down.x / selection.width, dragstate.up.x / selection.width);
    return;
  }
  if (e.keyCode == 113) { // q
    $('#preview-wrapper').hide();
    editor.buffer = null;
    editor.sample = null;
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
    return "translate(" + (d.x * (ui.width + ui.padding) + ui.offset_x) + "," + (d.y * (ui.height + ui.padding) + ui.offset_y) + ")";
  });

board.append("rect")
  .attr("class", "board-button")
  .attr("data-x", function(d) { return d.x })
  .attr("data-y", function(d) { return d.y })
  .attr("width", ui.width)
  .attr("x", 0)
  .attr("y", 0)
  .attr("rx", 3)
  .attr("ry", 3)
  .attr("height", ui.height)
  .style("opacity", function(d) {
    return 0.5
  });

var update_board_from_mouse = function(light) {
  return function(e) {
    var b = $(e.currentTarget)
    data = { x: b.data('x'), y: b.data('y'), i: light }
    device.receive({ data: JSON.stringify(data)});
    update_board_lights(data)
  }
}
$('.board-button').mouseover(function(e){
  update_board_from_mouse(mouseDown)(e);
})
$('.board-button').mousedown(update_board_from_mouse(1))
$('.board-button').mouseout(update_board_from_mouse(0))
$('.board-button').mouseup(update_board_from_mouse(0))

// ======= Render the samples

function prep_active_sample_for_removal(sample) {
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', false)
  currentKeyCode = (sample.sampleIndex+1).toString().charCodeAt(0)
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', true)
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
  cvs = document.querySelector("#preview");
  getFile(sample.name, function(data) {
    $('#preview-wrapper').show();
    $('#preview-wrapper .name').text(sample.name)
    editor.buffer = data;
    editor.sample = sample;
    var factor = data.length / window.innerWidth;
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
    var max = 0;
    // rms by chunk to determine a normalization factor
    for (var i = 0; i < b.length; i=Math.floor(i+factor)) {
      var rmsvalue = rms(b, i, factor);
      max = Math.max(max, rmsvalue);
    }
    var boost = (0.5 / max) * 256;
    for (var i = 0; i < b.length; i=Math.floor(i+factor)) {
      var rmsvalue = rms(b, i, factor) * boost;
      rmsvalue = Math.max(1.0, rmsvalue);
      c.fillStyle = "rgba(0, 0, 0, 1.0)";
      c.fillRect(j++, cvs.height / 1.3, 1.5, -rmsvalue * 1.5);
      c.fillStyle = "rgba(0, 0, 0, 0.4)";
      c.fillRect(j++, cvs.height / 1.3, 1.5, +rmsvalue * 0.5);
    }
  });
}

window.onload = function() {
  selection = document.querySelector("#selection");

  selection.addEventListener("mousedown", function(e) {
    dragstate.dragging = true;
    dragstate.down = {x: e.layerX, y: e.layerY};
  });

  selection.addEventListener("mouseup", function(e) {
    dragstate.dragging = false;
    if (!dragstate.moved) {
      return;
    }
    dragstate.up = {x: e.layerX, y: e.layerY};
  });

  selection.addEventListener("mousemove", function(e) {
    if (!dragstate.dragging) {
      return;
    }
    if (!dragstate.ctx) {
      dragstate.ctx = selection.getContext("2d");
    }
    dragstate.ctx.clearRect(0, 0, selection.width, selection.height);
    dragstate.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
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
    if ((i+1).toString().charCodeAt(0) == currentKeyCode) {
      switchSample(i, s.sampleIndex);
    }
  }
}

var time = d3.scale.linear().domain([0, 32]).range([100, ui.sample_width]);

var blobs = build_sample_line(
  'active-sample', 
  active_samples, 
  true, 
  prep_active_sample_for_removal, 
  function(d, i) { 
    return "translate("+ (17 * (ui.width + ui.padding)) +", " + (i * (ui.height + ui.padding) + ui.offset_y) + ")";
  }
)

function build_sample_line(class_name, data, keyed, click_handler, translate_func) {
  var blobs = chart.selectAll('.' + class_name)
    .data(data)
    .enter().append("g")
    .on("click", click_handler)
    .attr("class", class_name)
    .attr("data-sample", function(d) { console.log("I JUST GOT : ",d); return d.sampleIndex })
    .attr("transform", translate_func);
  blobs.append("rect")
    .attr("class", "sample-background")
    .attr("width", ui.sample_width)
    .attr("x", 0)
    .attr("y", 0)
    .attr("height", ui.height) 
  blobs.append("rect")
    .attr("class", function(d, i) {
      return (keyed) ? "duration keyed-" + (i+1).toString().charCodeAt(0) : 'duration';
    })
    .attr("width", ui.sample_width)
    .attr("x", 2)
    .attr("y", 2)
    .attr("height", ui.height - 4) 
  blobs.append("text")
    .attr("x", ui.padding)
    .attr("class", "display-name")
    .on("click", click_handler)
    .text(function(s){ return s.name })
    .attr("height", ui.height + ui.padding)
    .attr("dy", "1.2em")
  return blobs;
}

// these are the row lines, they are pulled out on their own
blobs.append("text")
  .attr("class", "row-id")
  .text(function(s,i){ return i+1 })
  .attr("height", ui.height + ui.padding)
  .attr("dy", "1.8em")
  .attr("x", "-15")

function update_waiting() { 
  var blobs = build_sample_line(
    'waiting-sample', 
    waiting_samples,
    false, 
    handle_sample_swap_click, 
    function(d, i) { 
      return "translate("+ (17 * (ui.width + ui.padding) + ui.sample_width + (3*ui.padding)) +", " + (i * (ui.height + ui.padding) + ui.offset_y) + ")";
      // return "translate(0, " + (i + 9) * (ui.height + ui.padding) + ")";
    }
  )
  var chart = d3.select(".chart")
    .attr("height", ((ui.height + ui.padding) * Math.max(9, waiting_samples.length) + ui.offset_y));
}

update_waiting();
