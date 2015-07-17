var http = require('http');
var fs = require('fs');
var url = require('url');

function load_album_list(callback) {
  fs.readdir("albums", function(err, files) {
    if (err) {
      callback(err);
    } else {
      var only_dirs = [];
      (function iterator(index) {
        if (index === files.length) {
          callback(null, only_dirs);
        } else {
          fs.stat("albums/" + files[index], function(err, stats) {
            if (err) {
              callback(err);
              return;
            }
            if (stats.isDirectory()) {
              var obj = { name : files[index] };
              only_dirs.push(obj);
            }
            iterator(index + 1);
          });
        }
      })(0);
    }
  });
}

function load_album(album_name, page, page_size, callback) {
  // We will just assume that any directory in our 'albums' subfolder is an
  // album.
  fs.readdir("albums/" + album_name, function(err, files) {
    if (err) {
      if (err.code === "ENOENT") {
        callback(no_such_album());
      } else {
        callback(make_error("file_error", JSON.stringify(err)));
      }
      return;
    }

    var only_files = [];
    var path = "albums/" + album_name + "/";

    (function iterator(index) {
      if (index === files.length) {
        var ps;
        // Slice fails gracefully if params are out of range.
        ps = only_files.splice(page * page_size, page_size);
        var obj = { short_name : album_name, photos : ps };
        callback(null, obj);
        return;
      }
      fs.stat(path + files[index], function(err, stats) {
        if (err) {
          callback(make_error("file_error", JSON.stringify(err)));
          return;
        }
        if (stats.isFile()) {
          var obj = { filename : files[index], desc : files[index] };
          only_files.push(obj);
        }
        iterator(index + 1);
      });
    })(0);
  });
}

function do_rename(old_name, new_name, callback) {
  // Rename the album folder.
  fs.rename("albums/" + old_name, "albums/" + new_name, callback);
}

function handle_incoming_request(request, result) {
  console.log("INCOMING REQUEST: " + request.method + " " + request.url);
  request.parsed_url = url.parse(request.url, true);
  var core_url = request.parsed_url.pathname;
  if (core_url === '/albums.json') {
    handle_list_albums(request, result);
  } else if (core_url.substr(core_url.length - 12) === '/rename.json' &&
             request.method.toLowerCase() === 'post') {
    handle_rename_album(request, result);
  } else if (core_url.substr(0, 7) === '/albums' &&
             core_url.substr(core_url.length - 5) === '.json') {
    handle_get_album(request, result);
  } else {
    send_failure(result, 404, invalid_resource());
  }
}
function handle_list_albums(request, result) {
  load_album_list(function(err, albums) {
    if (err) {
      send_failure(result, 500, err);
      return;
    }
    send_success(result, { albums : albums });
  });
}
function handle_get_album(request, result) {
  // Get the GET parameters
  var getp = request.parsed_url.query;
  var page_num = getp.page ? getp.page : 0;
  var page_size = getp.page_size ? getp.page_size : 1000;
  if (isNaN(parseInt(page_num))) {
    page_num = 0;
  }
  if (isNaN(parseInt(page_size))) {
    page_size = 1000;
  }

  // Format of request is /albums/album_name.json
  var core_url = request.parsed_url.pathname;
  var album_name = core_url.substr(7, core_url.length - 12);
  load_album(album_name, page_num, page_size, function(err, album_contents) {
    if (err && err.error === "no_such_album") {
      send_failure(result, 404, err);
    } else if (err) {
      send_failure(result, 500, err);
    } else {
      send_success(result, { album_data : album_contents });
    }
  });
}
function handle_rename_album(request, result) {
  // 1. Get the album name from the URL.
  var core_url = request.parsed_url.pathname;
  var parts = core_url.split('/');
  if (parts.length != 4) {
    send_failure(result, 404, invalid_resource(core_url));
    return;
  }

  var album_name = parts[2];

  // 2. Get the POST data for the request. This will have the JSON for the new
  // name for the album.
  var json_body = '';
  request.on('readable', function() {
    var d = request.read();
    if (d) {
      if (typeof d === 'string') {
        json_body += d;
      } else if (typeof d == 'object' && d instanceof Buffer) {
        json_body += d.toString('utf8');
      }
    }
  });

  // 3. When we have all the post data, make sure we have valid data and then
  // try to do the rename.

  request.on('end', function() {
    // Did we get a body?
    if (json_body) {
      try {
        var album_data = JSON.parse(json_body);
        if (!album_data.album_name) {
          send_failure(result, 403, missing_data('album_name'));
          return;
        }
      } catch (e) {
        // Got a body, but not valid json.
        send_failure(res, 403, bad_json());
        return;
      }

      // 4. Perform rename!
      do_rename(album_name, album_data.album_name, function(err, results) {
        if (err && err.code == "ENOENT") {
          send_failure(result, 403, no_such_album());
          return;
        } else if (err) {
          send_failure(result, 500, file_error(err));
          return;
        }
        send_success(result, null);
      });
    } else { // Didn't get a body.
      send_failure(result, 403, bad_json());
      result.end();
    }
  });
}

function send_success(result, data) {
  result.writeHead(200, { "Content-Type" : "application/json" });
  var output = { error : null, data : data };
  result.end(JSON.stringify(output) + "\n");
}
function send_failure(result, code, err) {
  var code = (err.code) ? err.code : err.name;
  result.writeHead(code, { "Content-Type" : "application/json" });
  result.end(JSON.stringify({ error : code, message : err.message }) + "\n");
}

function make_error(err, msg) {
  var e = new Error(msg);
  e.code = err;
  return e;
}
function invalid_resource() {
  return make_error("invalid_resource",
                    "The requested resource does not exist.");
}
function no_such_album() {
  return make_error("no_such_album", "The specified album does not exist");
}
function file_error(err) {
  var msg = "There was a file error on the server: " + err.message;
  return make_error("server_file_error", msg);
}
function missing_data(missing) {
  var msg = missing ? "Your request is missing: '" + missing + "'"
                    : "Your request is missing some data.";
  return make_error("missing_data", msg);
}
function bad_json() {
  return make_error("invalid_json", "the provided data is not valid JSON");
}

var s = http.createServer(handle_incoming_request);
s.listen(8080);
