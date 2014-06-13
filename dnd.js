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
  $('body').addClass('dragging')
  console.log("!! ondragenter !!")
}
document.addEventListener("drop",function(e) {
  $('body').removeClass('dragging')
  e.preventDefault();
  console.log("Drop");
  readfiles(e.dataTransfer.files);
  return false;
}, false);
document.addEventListener("dragover", function( event ) {
  $('body').addClass('dragging')
  // prevent default to allow drop
  console.log("!! dragover  !!")
  event.preventDefault();
  return false;
}, false);

document.body.ondragleave = function() {
  console.log("!!!??  ondragleave ???!")
  document.body.classList.remove("dragging")
}

