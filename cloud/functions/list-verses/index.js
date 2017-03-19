var datastore = require('@google-cloud/datastore')();

exports.list = function(req, res) {
  var cursor = req.param("cursor") || null;
  fetchTotal(function(total, totalError) {
    if (totalError) {
      return res.status(500).send(totalError);
    }

    fetchVerses(cursor, function(versesError, verses, endCursor) {
      if (versesError) {
        return res.status(500).send(versesError);
      }

      var result = {
        total: total,
        verses: verses.map(function(t) {
          return {
            id: t.id,
            author: t.author,
            username: t.username,
            text: t.text
          }
        }),
        cursor: endCursor
      };

      res.status(200).set({
        'Access-Control-Allow-Origin': 'http://www.longestpoemintheworld.com'
      }).send(JSON.stringify(result));
    });
  });
};

function fetchVerses(cursor, callback) {
  var versesPerPage = 16;

  var query = datastore.createQuery('Verse');
  query.order('timestamp', {
    descending: true
  });

  query.limit(versesPerPage);

  if (cursor != null) {
    query.start(cursor);
  }

  datastore.runQuery(query, function(err, entities, info) {
    if (!err) {
      callback(null, entities, info.endCursor);
    } else {
      callback(err);
    }
  });
}

function fetchTotal(callback) {
  var query = datastore.createQuery('__Stat_Kind__');
  query.filter('kind_name', 'Verse');
  datastore.runQuery(query, function(err, entities) {
    if (!err) {
      callback(entities[0].count, null);
    } else {
      callback(0, err);
    }
  });
}