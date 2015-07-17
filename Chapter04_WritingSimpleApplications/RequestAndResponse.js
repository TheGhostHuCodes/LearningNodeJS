var http = require('http');

function handle_incoming_request(request, response) {
  console.log("------------------------------------------------------------");
  console.log(request);
  console.log("------------------------------------------------------------");
  console.log(response);
  console.log("------------------------------------------------------------");
  response.writeHead(300, { "Content-Type" : "application/json" });
  response.end(JSON.stringify({ error : null }) + "\n");
}

var s = http.createServer(handle_incoming_request);
s.listen(8080);
