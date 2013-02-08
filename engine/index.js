var twitter = require("./twitter");
var poem = require("./poem");

twitter.fetch(function(tweet) {
	// we have a new tweet from the stream
	poem.isCandidate(tweet, function(candidate) {
		// the tweet is a good candidate (proper english, not too long, etc.)
		poem.getRhymingVerse(candidate, function(match) {
			// if no match is found, the module transparently saves the tweet for future pairing
			poem.push([candidate.tweet, match.tweet]);

			console.log(candidate.tweet.text + " ~ @" + candidate.tweet.user.screen_name);
			console.log(match.tweet.text + " ~ @" + match.tweet.user.screen_name);
		});
	});
});
