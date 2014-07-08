var RaspiCam = require("raspicam");
var fs = require("fs");

process.on('uncaughtException', function (err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
  console.error(err.stack)
  process.exit(1)
})

var camera = new RaspiCam({
	mode: "timelapse",
	output: "images/pic.jpg",
	timelapse: 1000
});

camera.on("exited", function(){
    console.log("exited");
});
camera.on("read", function(){
    console.log("read");
});
camera.start();

