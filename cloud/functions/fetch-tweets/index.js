var Twit = require('twit');
var pubsub = require('@google-cloud/pubsub')();
var storage = require('@google-cloud/storage')();
var cmudict;

exports.fetch = function(req, res) {
  var topic = pubsub.topic('tweets');
  var bucket = storage.bucket('longest-poem-in-the-world.appspot.com');
  bucket.file('twitter.json').download(function(err, contents) {
    if (err) {
      return res.status(500).send(err);
    }

    var credentials = JSON.parse(contents);
    fetchTweets(credentials, function(tweets, err) {
      if (err) {
        return res.status(500).send(err);
      }

      console.log("Fetched " + tweets.length + " tweets.");

      bucket.file('cmudict.json').download(function(err, contents) {
        cmudict = JSON.parse(contents);
        var candidates = tweets.filter(hasPotential);

        console.log("Filtered to " + candidates.length + " candidates.");

        if (candidates.length > 0) {
          topic.publish(candidates, function(err) {
            if (err) {
              return res.status(500).send(err);
            }

            res.status(200).send('OK with ' + candidates.length + ' candidates');
          });
        } else {
          res.status(200).send('OK but no candidates');
        }
      });
    });
  });
}

function fetchTweets(credentials, callback) {
  var searchTerms = ["and", "the", "am", "i", "is", "to"];

  var T = new Twit({
    consumer_key : credentials.consumer_key,
    consumer_secret : credentials.consumer_secret,
    access_token : credentials.access_token,
    access_token_secret : credentials.access_token_secret
  });

  T.get('search/tweets', {
    q: searchTerms.join(" OR "),
    count: 100,
    langauge: 'en'
  }, function(err, data, response) {
    if (err) {
      return callback(null, err);
    }

    var tweets = data.statuses.map(function(t) {
      return {
        id: t.id_str,
        text: t.text,
        author: t.user.name,
        username: t.user.screen_name,
      }
    });

    callback(tweets);
  });
}

function hasPotential(tweet) {
  // dismiss retweets and replies
  var lowercaseText = tweet.text.toLowerCase();
  if (startsWith(lowercaseText, "rt") || startsWith(lowercaseText, "@") || startsWith(lowercaseText, ".")) {
    return false;
  }

  // dismiss tweets with links
  if (tweet.text.indexOf("http://") > -1) {
    return false;
  }

  var text = cleanUpText(tweet.text);
  var words = text.split(" ");
  tweet.lastWord = words[words.length - 1];

  // limit length of verses to a reasonable number of syllables
  var syllableCount = words.map(getSyllableCount).reduce(function(a, b) { return a + b; });
  if (syllableCount > 16) {
    return false;
  }
  tweet.syllableCount = syllableCount;

  var rhymes = getRhymesForWords(words);

  // check that all words are in the dictionary => proper english
  if (rhymes.length != words.length) {
    return false;
  }

  tweet.rhyme = rhymes[rhymes.length - 1];

  return true;
};

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

function getRhymesForWords(words) {
  var rhymes = [];
  words.map(function(word) {
    word = word.toLowerCase();
    if (cmudict.hasOwnProperty(word)) {
      rhymes.push(cmudict[word]);
    }
  });

  return rhymes;
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

  if (number === 0) {
    return "zero";
  } else {
    return convert_millions(number);
  }
}

function startsWith(str, strWith) {
  return str.substring(0, strWith.length) === strWith;
}
