var datastore = require('@google-cloud/datastore')();

exports.parse = function(event, callback) {
  var tweet = JSON.parse(Buffer.from(event.data.data, 'base64').toString());
  getRhymingTweet(tweet, function(pair) {
    if (pair == null) {
      saveTweetForLater(tweet, function(success, error) {
        if (!success) {
          console.log(error);
        }

        callback();
      });
    } else {
      removeTweetCandidate(pair.id, function(success, error) {
        if (!success) {
          console.log(error);
        }

        appendTweetsToPoem([tweet, pair], function(success, error) {
          if (!success) {
            console.log(error);
          }

          callback();
        });
      });
    }
  });
}

function getRhymingTweet(tweet, callback) {
  var query = datastore.createQuery('Tweet');
  query.filter('rhyme', tweet.rhyme);
  // TODO: figure out a way to do query.filter('lastWord', '!=', tweet.lastWord)
  datastore.runQuery(query, function(err, entities) {
    if (entities.length == 0) {
      callback(null);
    } else {
      for (var k in entities) {
        var pair = entities[k];
        if (pair.lastWord != tweet.lastWord) {
          return callback(pair);
        }
      }

      callback(null);
    }
  });
}

function saveTweetForLater(tweet, callback) {
  datastore.save({
    key: datastore.key(['Tweet', tweet.id]),
    data: tweet
  }, function(err) {
    if (!err) {
      callback(true);
    } else {
      callback(false, err)
    }
  });
}

function appendTweetsToPoem(tweets, callback) {
  var objects = tweets.map(function(t) {
    t.timestamp = Date.now();
    return {
      key: datastore.key(['Verse', t.id]),
      data: t
    };
  });

  datastore.save(objects, function(err) {
    if (!err) {
      callback(true);
    } else {
      callback(false, err)
    }
  });
}

function removeTweetCandidate(id, callback) {
  var key = datastore.key(['Tweet', id]);
  datastore.delete(key, function(err) {
    if (!err) {
      callback(true);
    } else {
      callback(false, err)
    }
  });
}