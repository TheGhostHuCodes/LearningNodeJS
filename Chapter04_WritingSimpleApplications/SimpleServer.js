var http = require('http');

function handle_incoming_request(request, result) {
  console.log("INCOMING REQUEST: " + request.method + " " + request.url);
  result.writeHead(200, { "Content-Type" : "application/json" });
  result.end(JSON.stringify({ error : null }) + "\n");
}

var s = http.createServer(handle_incoming_request);
s.listen(8080);
