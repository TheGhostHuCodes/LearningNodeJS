var fs = require('fs');

var handle = fs.openSync('info.txt', 'r');
var buffer = new Buffer(100000);
var read = fs.readSync(handle, buffer, 0, 10000, null);
console.log(buffer.toString('utf8', 0, read));
fs.closeSync(handle);
