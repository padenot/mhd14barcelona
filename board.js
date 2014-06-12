// file for each line of 16
// pick window for each line to span

var chart = d3.select(".chart")
  .attr("width", 800)
  .attr("height", 500);

var data = [];
for (var x = 0; x < 16; ++x) {
  for (var y = 0; y < 8; ++y) {
    data.push({ x: x, y: y, i: 0});
  }
}

function updateUi(d){
  chart.selectAll('[data-x="' + d.x + '"][data-y="' + d.y + '"]').style("fill", (d.i) ? ui.color_down : ui.color_up)
}

var ui = {
  width: 20,
  height: 20,
  padding: 3,
  color_down: 'rgb(255, 184, 0)',
  color_up: 'rgb(179, 171, 153)'
}

var mouseDown = 0;
document.body.onmousedown = function() { 
  ++mouseDown;
}
document.body.onmouseup = function() {
  --mouseDown;
}

var board = chart.selectAll("g")
  .data(this.data)
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
  updateUi(data)
})

$('.board-button').mousedown(function(e){
  var b = $(e.currentTarget)
  data = { x: b.data('x'), y: b.data('y'), i: 1 }
  device.receive({ data: JSON.stringify(data)});
  updateUi(data)
})

$('.board-button').mouseout(function(e){
  var b = $(e.currentTarget)
  data = { x: b.data('x'), y: b.data('y'), i: 0 }
  device.receive({ data: JSON.stringify(data)});
  updateUi(data)
})
$('.board-button').mouseup(function(e){
  var b = $(e.currentTarget)
  data = { x: b.data('x'), y: b.data('y'), i: 0 }
  device.receive({ data: JSON.stringify(data)});
  updateUi(data)
})

active_samples = [];
lines.forEach(function(sample, i){ 
  active_samples.push({
    name: sample.url,
    button: i,
    sampleIndex: i
  })
})

var blobs = chart.selectAll('.active-sample')
  .data(active_samples)
  .enter().append("g")
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
  .text(function(s){ return s.name })
  .attr("height", ui.height + ui.padding)
  .attr("dy", "1em")

function updateSample(index, sample) {
  // console.log("Trying to update "+index+" : given '"+time(sample.audio_buffer.duration)+"' :: ",sample)
  chart.selectAll('[data-sample="' + index + '"] text').text(sample.url + " : " + Math.round(sample.audio_buffer.duration * 1000) + "ms")
  chart.selectAll('[data-sample="' + index + '"] rect').attr("width", time(sample.audio_buffer.duration))
}

waiting_samples = [];
for (var i = 8; i < samples.length; ++i) {
  waiting_samples.push({
    name: samples[i],
    sampleIndex: i
  })
}

var currentKeyCode = null;
$('body').keypress(function(e){
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', false)
  currentKeyCode = e.charCode;
  chart.selectAll('.keyed-' + currentKeyCode).classed('active-key-press', true)
});

function loadSample(sample) {
  console.log("!!!")
  for (var i = 0; i < 8; ++i) {
    if ( (i+1).toString().charCodeAt(0) == currentKeyCode) {
      console.log("Time to switch out a Sample");
      switchSample(i, sample.sampleIndex);
    }
  }
}

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
  .on("click", loadSample)
blobs.append("text")
  .text(function(s){ return s.name })
  .on("click", loadSample)
  .attr("height", ui.height + ui.padding)
  .attr("dy", "1em")


