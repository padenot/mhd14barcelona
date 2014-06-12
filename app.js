var connection = new WebSocket('ws://127.0.0.1:1337');

connection.onopen = function () {
    // connection is opened and ready to use
   console.log("open")
};

connection.onerror = function (error) {
  connection.close();
};

connection.onmessage = function (message) {
    connection.send(message.data);
};

window.onbeforeunload = function() {
  console.log("onbeforeunload")
  connection.onclose = function () {}; // disable onclose handler first
  connection.close()
};
