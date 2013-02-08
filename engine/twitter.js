var http = require("http");
var crypto = require('crypto');
var journal = require("./journal");

// read config file, containing twitter oauth data and various other preferences
var config = require("./config").read("app");
if (JSON.stringify(config.twitter.auth).indexOf("...") > 0) {
	console.log("Please add your Twitter API authorization tokens to `app.config`");
	process.exit(1);
}

exports.fetch = function(callback) {
	// NOTE: take care when changing the search_interval variable
	// the rate limit in Search API v1.1 is 180 requests / 15 minutes, meaning 1 request every 5 seconds

	setInterval(function() {
		fetchTweets(callback);
	}, config.twitter.search_interval * 1000);

	fetchTweets(callback);
};

exports.stream = function(callback) {
	// TODO: use streaming API
};

function fetchTweets(callback) {
	// https://dev.twitter.com/docs/api/1.1/get/search/tweets
	journal.info("fetching tweets");

	var queryParams = {
		"lang": "en",
		"result_type": "recent",
		"count": "100",
		"q": config.twitter.search_terms.join(" OR ") // filter for common english words
	};

	var httpOptions = {
		hostname: 'api.twitter.com',
		path: "/1.1/search/tweets.json?" + serializeEncodeObject(queryParams).join("&"),
		headers: {
			'user-agent': 'Longest Poem In The World (v1, ' + process.pid + ')',
			'authorization': generateAuthorizationHeader("get", "http://api.twitter.com/1.1/search/tweets.json", queryParams)
		}
	};

	http.get(httpOptions, function(response) {
		var result = "";
		
		response.setEncoding('utf8');

		response.on("data", function(chunk) {
			result += chunk;
		});

		response.on("end", function() {
			if (response.statusCode == 200) {
				try {
					var tweets = JSON.parse(result);
					for (var i = 0; i < tweets.statuses.length; i++) {
						callback(tweets.statuses[i]);
					}
				} catch(e) {
					journal.error("Twitter API error: " + e);
				}
			} else {
				journal.error("Twitter API error [" + response.statusCode + "]: " + JSON.stringify(response.headers) + ", " + result);
			}
		});
	});
}

function generateAuthorizationHeader(method, url, queryParams) {
	// https://dev.twitter.com/docs/auth/authorizing-request
	// https://dev.twitter.com/docs/auth/creating-signature

	var now = new Date();

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
