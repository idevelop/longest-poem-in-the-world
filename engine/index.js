var twitter = require("./twitter");
var poem = require("./poem");

twitter.fetch(function(tweet) {
	// we have a new tweet from the stream
	poem.hasPotential(tweet, function(hasPotential, candidate) {
		// the tweet is a good candidate (proper english, not too long, unique, etc.)
		if (hasPotential) {
			poem.findTweetThatRhymes(candidate, function(match) {
				if (match) {
					// found a match, appending both to poem
					poem.appendTweetsToPoem([candidate, match], function(success) {
						console.log(candidate.text + " ~ @" + candidate.username);
						console.log(match.text + " ~ @" + match.username);
					});
				} else {
					// did not find a match, maybe later
					poem.saveTweetForLater(candidate);
				}
			});
		}
	})
});
