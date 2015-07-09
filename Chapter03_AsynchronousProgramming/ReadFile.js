var fs = require('fs');

fs.open('info.txt', 'r', function(err, handle) {
  if (err) {
    console.log("ERROR: " + err.code + " (" + err.message + ")");
    return;
  }
  var buffer = new Buffer(100000);
  fs.read(handle, buffer, 0, 100000, null, function(err, length) {
    if (err) {
      console.log("ERROR: " + err.code + " (" + err.message + ")");
      return;
    }
    console.log(buffer.toString('utf8', 0, length));
    fs.close(handle, function() {});
  });
});
