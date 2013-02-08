var http = require('http');
var url = require("url");
var poem = require('../engine/poem');

http.createServer(function (request, response) {
	if (request.method == "GET") {
		var uri = url.parse(request.url, true);

		if (uri.pathname == '/') {
			response.writeHead(200, {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST',
				'Access-Control-Allow-Headers': 'Content-Type',
				'Content-Type': 'application/json; charset=utf-8'
			});

			poem.list({
				start: parseInt(uri.query.start) || 0,
				count: parseInt(uri.query.count) || 14
			}, function(verses) {
				response.end(JSON.stringify(verses));
			});
		} else {
			response.writeHead(400, {'Content-Type': 'text/plain'});
			response.end('Path not supported\n');
		}
	} else
	if (request.method == "POST") {
		// TODO: accept couplet proposals
		response.writeHead(400, {'Content-Type': 'text/plain'});
		response.end('Method not supported yet\n');
	} else {
		response.writeHead(400, {'Content-Type': 'text/plain'});
		response.end('Method not supported\n');
	}
}).listen(3000);
