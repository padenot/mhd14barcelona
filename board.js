// file for each line of 16
// pick window for each line to span

var chart = d3.select(".chart")
  .attr("width", 500)
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
  width: 10,
  height: 10,
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
  window.reb = e
  var b = $(e.currentTarget)
  var index = b.data('index')
  if (mouseDown) {
    chart.selectAll('[data-index="' + index + '"]').style("fill", ui.color_down)
    device.receive({ data: JSON.stringify({x: b.data('x'), y: b.data('y'), i: 1}) });
  } else {
    chart.selectAll('[data-index="' + index + '"]').style("fill", ui.color_up)
    device.receive({ data: JSON.stringify({x: b.data('x'), y: b.data('y'), i: 0}) });
  }
})

$('.board-button').mousedown(function(e){
  var b = $(e.currentTarget)
  var index = b.data('index')
  chart.selectAll('[data-index="' + index + '"]').style("fill", ui.color_down)
  device.receive({ data: JSON.stringify({x: b.data('x'), y: b.data('y'), i: 1}) });
})
$('.board-button').mouseout(function(e){
  var b = $(e.currentTarget)
  var index = b.data('index')
  chart.selectAll('[data-index="' + index + '"]').style("fill", ui.color_up)
  device.receive({ data: JSON.stringify({x: b.data('x'), y: b.data('y'), i: 0}) });
})
$('.board-button').mouseup(function(e){
  var b = $(e.currentTarget)
  var index = b.data('index')
  chart.selectAll('[data-index="' + index + '"]').style("fill", ui.color_up)
  device.receive({ data: JSON.stringify({x: b.data('x'), y: b.data('y'), i: 0}) });
})

// connection.onmessage = function (message) {
//   var d = JSON.parse(message.data)
//   chart.selectAll('[data-x="' + d.x + '"][data-y="' + d.y + '"]').style("fill", (d.i) ? ui.color_down : ui.color_up)
//   connection.send(message.data);
// };