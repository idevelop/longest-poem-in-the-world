var Twit = require('twit');

// read config file, containing twitter oauth data and various other preferences
var config = require("./config").read("application");
if (JSON.stringify(config.twitter.auth).indexOf("...") > 0) {
	console.log("Please add your Twitter API authorization tokens to `application.config`");
	process.exit(1);
};

exports.fetch = function(callback) {
	// NOTE: take care when changing the search_interval variable
	// the rate limit in Search API v1.1 is 180 requests / 15 minutes, meaning 1 request every 5 seconds

	setInterval(function() {
		fetchTweets(callback);
	}, config.twitter.search_interval * 1000);

	fetchTweets(callback);
};

function fetchTweets(callback) {
	var T = new Twit({
		consumer_key : config.twitter.auth.consumer_key,
		consumer_secret : config.twitter.auth.consumer_secret,
		access_token : config.twitter.auth.access_token,
		access_token_secret : config.twitter.auth.access_token_secret
	});

	var stream = T.stream('statuses/filter', { track: config.twitter.search_terms, langauge:'en' });
	stream.on('tweet', function (tweet) {
		// console.log(tweet.text)
		callback({
			id: tweet.id_str,
			text: tweet.text,
			author: tweet.user.name,
			username: tweet.user.screen_name,
		});
	});
} 
