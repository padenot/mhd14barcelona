function readfiles(files) {
  for (var i = 0; i < files.length; i++) {
    (function (i) {
      reader = new FileReader();
      reader.onload = function(event) {
        console.log(event.target);
        var s = {
          name: files[i].name,
          sampleIndex: samples.length,
          raw_buffer: this.result,
          dropped:true
        };

        console.log(event.target.result);

        waiting_samples.push(s);
        samples.push(s);

        update_waiting();
      }
      reader.readAsArrayBuffer(files[i]);
    })(i);
  }
}
document.body.ondragenter = function() {
  document.body.classList.add("dragging")
  document.addEventListener("drop",function(e) {
    document.body.classList.remove("dragging")
    e.preventDefault();
    console.log("Drop");
    readfiles(e.dataTransfer.files);
  }, false);
}
document.addEventListener("dragover", function( event ) {
  // prevent default to allow drop
  event.preventDefault();
}, false);

document.body.ondragleave = function() {
  document.body.classList.remove("dragging")
}

