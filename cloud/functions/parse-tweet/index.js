var datastore = require('@google-cloud/datastore')();

exports.parse = function(event, callback) {
  var tweet = JSON.parse(Buffer.from(event.data.data, 'base64').toString());
  getRhymingTweet(tweet.rhyme, function(pair) {
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

function getRhymingTweet(rhyme, callback) {
  var query = datastore.createQuery('Tweet');
  query.filter('rhyme', rhyme);
  query.limit(1);
  datastore.runQuery(query, function(err, entities) {
    if (entities.length == 0) {
      callback(null);
    } else {
      callback(entities[0]);
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
  // tweets = [{ id, author, text }]
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