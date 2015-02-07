var Parse = require('parse').Parse;
var isParseSetUp = false;

// read config file, containing twitter oauth data and various other preferences
var config = require("./config").read("application");
if (JSON.stringify(config.parse).indexOf("...") === -1) {
  Parse.initialize(config.parse.application_id, config.parse.javascript_key);
  isParseSetUp = true;
}

var cmudict = JSON.parse(require("fs").readFileSync(config.dictionary, "utf8"));
var tweetsByRhyme = {};

exports.hasPotential = function(tweet, callback) {
  // dismiss retweets and replies
  if (tweet.text.toLowerCase().startsWith("rt") || tweet.text.toLowerCase().startsWith("@")) {
    return callback(false);
  }

  // dismiss tweets with links
  if (tweet.text.indexOf("http://") > -1) {
    return callback(false);
  }

  var text = cleanUpText(tweet.text);
  var words = text.split(" ");
  tweet.lastWord = words[words.length - 1];

  // limit length of verses to a reasonable number of syllables
  var syllableCount = words.map(getSyllableCount).reduce(function(a, b) { return a + b; });
  if (syllableCount > config.syllable_limit) {
    return callback(false);
  }
  tweet.syllableCount = syllableCount;

  getRhymesForWords(words, function(rhymes) {
    // check that all words are in the dictionary => proper english
    if (rhymes.length != words.length) {
      return callback(false);
    }

    tweet.rhyme = rhymes[rhymes.length - 1];

    callback(true, tweet);
  });
};

exports.findTweetThatRhymes = function(tweet, callback) {
  if (tweetsByRhyme.hasOwnProperty(tweet.rhyme)) {
    for (var i = 0; i < tweetsByRhyme[tweet.rhyme].length; i++) {
      if (tweetsByRhyme[tweet.rhyme][i].lastWord != tweet.lastWord) {
        var match = tweetsByRhyme[tweet.rhyme][i];
        tweetsByRhyme[tweet.rhyme].splice(i, 1);
        return callback(match);
      }
    }
  } else {
    callback();
  }
};

exports.appendTweetsToPoem = function(tweets, callback) {
  if (!isParseSetUp) {
    return callback(false);
  };

  parseLogin(function(success) {
    if (!success) return;

    Parse.Cloud.run("appendTweetsToPoem", {
      tweets: tweets
    }).then(function(success) {
      callback(success);
    }).fail(function(error) {
      console.error(error);
    });
  })
};

exports.saveTweetForLater = function(tweet) {
  if (!tweetsByRhyme.hasOwnProperty(tweet.rhyme)) {
    tweetsByRhyme[tweet.rhyme] = [];
  };

  var length = tweetsByRhyme[tweet.rhyme].push(tweet);
  if (length > config.tweet_storage_limit) {
    tweetsByRhyme[tweet.rhyme] = tweetsByRhyme[tweet.rhyme].slice(-config.tweet_storage_limit);
  }
}

// --- Private functions --- //

function parseLogin(callback) {
  if (Parse.User.current()) {
    callback(true);
  } else {
    Parse.User.logIn(config.parse.username, config.parse.password).then(function(result) {
      callback(true);
    }).fail(function(error) {
      callback(false);
    });
  }
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

function getRhymesForWords(words, callback) {
  var rhymes = [];
  words.map(function(word) {
    word = word.toLowerCase();
    if (cmudict.hasOwnProperty(word)) {
      rhymes.push(cmudict[word]);
    }
  })

  callback(rhymes);
}

// http://stackoverflow.com/questions/646628/javascript-startswith
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str) {
    return this.substring(0, str.length) === str;
  };
}
