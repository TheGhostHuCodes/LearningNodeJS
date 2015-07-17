var http = require('http');
var qs = require('querystring');

function handle_incoming_request(request, response) {
  var body = '';
  request.on('readable', function() {
    var d = request.read();
    if (d) {
      if (typeof d === 'string') {
        body += d;
      } else if (typeof d === 'object' && d instanceof Buffer) {
        body += d.toString('utf8');
      }
    }
  });
  request.on('end', function() {
    if (request.method.toLowerCase() === 'post') {
      var POST_data = qs.parse(body);
      console.log(POST_data);
    }
    response.writeHead(200, { "Content-Type" : "application/json" });
    response.end(JSON.stringify({ error : null }) + "\n");
  });
}

var s = http.createServer(handle_incoming_request);
s.listen(8080);
