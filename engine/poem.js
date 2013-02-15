var redis = require("redis").createClient();
var dictionary = require("./dictionary");
var journal = require("./journal");

// read config file, containing twitter oauth data and various other preferences
var config = require("./config").read("app");

redis.on("error", function (error) {
	if (error.toString().indexOf("ECONNREFUSED") != -1) {
		console.log("Error: redis server offline.");
		process.exit(1);
	}

	journal.error("redis: " + error);
});

exports.isCandidate = function(tweet, successCallback) {
	// dismiss retweets and replies
	if (tweet.text.toLowerCase().startsWith("rt") || tweet.text.toLowerCase().startsWith("@")) return;

	// dismiss tweets with links
	if (tweet.text.indexOf("http://") > -1) return;

	redis.sismember("longestpoem.tweets", tweet.id_str, function(error, exists) {
		// did we already consider this tweet? duplicates could happen, you never know...
		if (!exists) {
			redis.sadd("longestpoem.tweets", tweet.id_str); // mark tweet as "considered", to avoid unnecessary future retesting
			var text = cleanUpText(tweet.text);
			var words = text.split(" ");

			dictionary.getMultiple(words, function(translations) {
				// check that all words are in the dictionary => proper english
				for (var i = 0; i < translations.length; i++) {
					if (translations[i] === null) return;
				}

				var rhymePhoneme = getRelevantPhoneme(translations[translations.length - 1]);
				var syllableCount = words.map(getSyllableCount).reduce(function(a, b) { return a + b; });

				// limit length of verses to a reasonable number of syllables
				if (syllableCount > config.syllable_limit) return;

				successCallback({
					tweet: tweet,
					rhyme: rhymePhoneme,
					syllableCount: syllableCount,
					lastWord: words[words.length - 1]
				});
			});
		}
	});
};

exports.getRhymingVerse = function(candidate, callback, ids) {
	ids = ids || [];

	// we keep a list for each relevant phonetical ending, coresponding directly to a rhyme
	var listKey = "longestpoem.candidates_" + candidate.rhyme.replace(/ /g, "_");
	redis.lpop(listKey, function(error, match) {
		if (match !== null) {
			var matchingObject = JSON.parse(match);

			if (ids.indexOf(matchingObject.tweet.id_str) > -1) {
				// we have looped over the entire list, no rhyming tweets are good enough
				redis.rpush(listKey, JSON.stringify(candidate));
				return;
			}

			// do not pair verses that end in the same word, that's just lazy
			// also, couplets should have roughtly the same number of syllables
			if ((candidate.lastWord != matchingObject.lastWord) && (Math.abs(candidate.syllableCount - matchingObject.syllableCount) <= 4)) {
				callback(matchingObject); // hurray!
			} else {
				// although they rhyme, it's not a good rhyme

				// we push the match back into the list, at the end
				redis.rpush(listKey, match);

				// and try again on the same list of rhyming tweets, also keeping track of ids we've already seen
				// this works because we pop from the left and push to the right of the possible matches list
				ids.push(matchingObject.tweet.id_str);
				exports.getRhymingVerse(candidate, callback, ids); // TODO: should we limit the number of recursion levels?
			}
		} else {
			// list is empty, candidate is first one with this rhyme
			redis.rpush(listKey, JSON.stringify(candidate));
		}
	});
};

exports.push = function(couplet) {
	// couplet: [tweet_1, tweet_2];
	journal.info("pushing pair " + couplet[0].id_str + " " + couplet[1].id_str);
	
	redis.lpush("longestpoem.verses", JSON.stringify(couplet[0]), JSON.stringify(couplet[1]));
	redis.bgsave(function(){});
};

exports.list = function(options, callback) {
	redis.llen("longestpoem.verses", function(error, totalVerses) {
		if (error) return callback({total: 0});

		redis.lrange("longestpoem.verses", options.start, options.start + options.count - 1, function(error, verses) {
			if (error) return callback({total: 0});
			
			callback({
				total: totalVerses,
				verses: verses.map(JSON.parse).map(function(tweet) {
					return {
						id: tweet.id_str,
						text: tweet.text,
						user: tweet.user.screen_name,
						name: tweet.user.name
					};
				})
			});
		});
	});
};

// --- Private functions --- //

function getRelevantPhoneme(phoneticalTranslation) {
	var lastAccentPosition = phoneticalTranslation.lastIndexOf("1");
	if (lastAccentPosition == -1) lastAccentPosition = phoneticalTranslation.lastIndexOf("0");

	var groupStartPosition = phoneticalTranslation.substr(0, lastAccentPosition).lastIndexOf(" ");
	phoneticalTranslation = phoneticalTranslation.substr(groupStartPosition + 1);

	return phoneticalTranslation;
}

function cleanUpText(text) {
	var smileys = [":s", ":p", ":d", ":x", "xd", ":o(", ":o)", ":-s", ":-d", ":-p", ":-x", ";d", ":3", "<3", "T_T"];
	text = text.toLowerCase();

	// replace html entities
	text = text.replace(/&amp;/g, ' and ');
	text = text.replace(/&lt;/g, '<');
	text = text.replace(/&gt;/g, '>');
	
	text = text.replace(new RegExp('(' + smileys.join('|') + ')', 'g'), ''); // eliminate smileys

	text = text.replace(/[^a-z0-9\']/g, " ").trim(); // eliminate punctuation, leave alphanumeric and apostrophe
	text = text.replace(/\'+/g, "'").replace(/\'$/g, '').replace(/^\'/g, '').replace(/(\s\')/g, ' '); // remove invalid apostrophes
	text = text.replace(/ +(?= )/g,''); // eliminate multiple spaces
	
	// translate numbers into words
	text = text.split(" ").map(function(word) {
		return isNumber(word) ? numberToWords(word) : word;
	}).join(" ");

	// we should now have a clean, words-only version of the text
	return text.trim();
}

// http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric
function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

// http://stackoverflow.com/questions/5686483/how-to-compute-number-of-syllables-in-a-word-in-javascript
function getSyllableCount(word) {
	word = word.toLowerCase();
	if (word.length <= 3) { return 1; }
	word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
	word = word.replace(/^y/, '');
	var vowels = word.match(/[aeiouy]{1,2}/g);
	return (vowels !== null) ? vowels.length : 0;
}

// http://stackoverflow.com/questions/5529934/javascript-numbers-to-words
function numberToWords(number) {
	var ones = ['','one','two','three','four','five','six','seven','eight','nine'];
	var tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
	var teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];

	function convert_millions(num) {
		if (num >= 1000000) {
			return convert_millions(Math.floor(num / 1000000)) + " million " + convert_thousands(num % 1000000);
		} else {
			return convert_thousands(num);
		}
	}

	function convert_thousands(num) {
		if (num >= 1000) {
			return convert_hundreds(Math.floor(num / 1000)) + " thousand " + convert_hundreds(num % 1000);
		} else {
			return convert_hundreds(num);
		}
	}

	function convert_hundreds(num) {
		if (num > 99){
			return ones[Math.floor(num / 100)] + " hundred " + convert_tens(num % 100);
		} else {
			return convert_tens(num);
		}
	}

	function convert_tens(num) {
		if (num < 10) return ones[num];
		else if (num >= 10 && num < 20) return teens[num - 10];
		else {
			return tens[Math.floor(num / 10)] + " " + ones[num % 10];
		}
	}

	if (number == 0) {
		return "zero";
	} else {
		return convert_millions(number);
	}
}

// http://stackoverflow.com/questions/646628/javascript-startswith
if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str) {
		return this.substring(0, str.length) === str;
	};
}
