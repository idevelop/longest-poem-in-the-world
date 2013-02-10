var redis = require("redis").createClient();
var dictionary = require("./dictionary");
var journal = require("./journal");
var rhymeBacklog = {};

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
			id: tweet.id_str,
			text: tweet.text,
			user: tweet.user.screen_name,
			name: tweet.user.name,
			rhyme: rhymePhoneme,
			syllableCount: syllableCount,
			lastWord: words[words.length - 1]
		});
	});
};

exports.getRhymingVerse = function(candidate, callback) {
	// we keep a list for each relevant phonetical ending, coresponding directly to a rhyme
	var listKey = candidate.rhyme.replace(/ /g, "_");
	if (!rhymeBacklog.hasOwnProperty(listKey)) {
		rhymeBacklog[listKey] = [candidate];
		return;
	}

	var backlogList = rhymeBacklog[listKey];

	var found = false;
	for (var i = 0; i < backlogList.length; i++) {
		var matchingObject = backlogList.splice(i, 1)[0];

		// do not pair verses that end in the same word, that's just lazy
		// also, couplets should have roughtly the same number of syllables
		if ((candidate.lastWord != matchingObject.lastWord) && (Math.abs(candidate.syllableCount - matchingObject.syllableCount) <= 4)) {
			callback(matchingObject); // hurray!
			found = true;
			break;
		} else {
			backlogList.push(matchingObject);
		}
	}

	if (!found) {
		backlogList.push(candidate);
	}
};

exports.push = function(couplet) {
	// couplet: [tweet_1, tweet_2];
	journal.info("pushing pair " + couplet[0].id + " " + couplet[1].id);

	redis.incrby("longestpoem.length", 2, function(error, total) {
		redis.publish("longestpoem.verses", JSON.stringify({
			total: total,
			couplet: couplet
		}));
	});
};

exports.subscribe = function(callback) {
	redis.subscribe("longestpoem.verses");
	redis.on("message", function (channel, message) {
		if (channel == "longestpoem.verses") {
			var data = JSON.parse(message);
			callback(data);
		}
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
