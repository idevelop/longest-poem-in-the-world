var http = require("http");
var https = require("https");
var crypto = require('crypto');

// read config file, containing twitter oauth data and various other preferences
var config = require("./config").read("app");
if (JSON.stringify(config.twitter.auth).indexOf("...") > 0) {
	console.log("Please add your Twitter API authorization tokens to `app.config`");
	process.exit(1);
}

exports.stream = function(callback) {
	// https://dev.twitter.com/docs/api/1.1/post/statuses/filter

	var queryParams = {
		"track": config.twitter.search_terms.join(",") // filter for common english words
	};

	var httpOptions = {
		hostname: 'stream.twitter.com',
		path: "/1.1/statuses/filter.json?" + serializeEncodeObject(queryParams).join("&"),
		headers: {
			'user-agent': 'Longest Poem In The World (v1, ' + process.pid + ')',
			'authorization': generateAuthorizationHeader("get", "https://stream.twitter.com/1.1/statuses/filter.json", queryParams)
		}
	};

	var request = https.request(httpOptions, function(response) {
		response.setEncoding('utf8');
		response.on('data', function(data) {
			try {
				var tweet = JSON.parse(data);
				callback(tweet);
			} catch (e) {
				// TODO: parseexception handling
			}
		});

		response.on('end', function() {
			console.log("Twitter stream connection interrupted.");
		});
	});

	request.end();
};

function generateAuthorizationHeader(method, url, queryParams) {
	// https://dev.twitter.com/docs/auth/authorizing-request
	// https://dev.twitter.com/docs/auth/creating-signature

	var now = new Date();
	
	queryParams = queryParams || {};

	var parameterArray = [];

	var oAuthVariables = {
		oauth_consumer_key: config.twitter.auth.consumer_key,
		oauth_nonce: now.getTime(),
		oauth_signature_method: "HMAC-SHA1",
		oauth_timestamp: Math.floor(now.getTime() / 1000),
		oauth_token: config.twitter.auth.access_token,
		oauth_version: "1.0"
	};

	parameterArray = serializeEncodeObject(oAuthVariables).concat(serializeEncodeObject(queryParams));
	parameterArray.sort();

	var signatureBaseString = method.toUpperCase() + "&" + encodeURIComponent(url) + "&" + encodeURIComponent(parameterArray.join("&"));
	var signingKey = encodeURIComponent(config.twitter.auth.consumer_secret) + "&" + encodeURIComponent(config.twitter.auth.access_token_secret);

	oAuthVariables.oauth_signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest("base64");

	var headerArray = [];
	for (var key in oAuthVariables)
		headerArray.push(encodeURIComponent(key) + '="' + encodeURIComponent(oAuthVariables[key]) + '"');

	return "OAuth " + headerArray.join(", ");
}

function serializeEncodeObject(object) {
	var encodedArray = [];
	for (var key in object)
		encodedArray.push(encodeURIComponent(key) + "=" + encodeURIComponent(object[key]));

	return encodedArray;
}
