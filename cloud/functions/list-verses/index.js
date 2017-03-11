var datastore = require('@google-cloud/datastore')();

exports.list = function(req, res) {
  var page = req.param("page") || 1;
  fetchTotal(function(total, totalError) {
    if (totalError) {
      return res.status(500).send(totalError);
    }

    fetchVerses(page, function(verses, versesError) {
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
        })
      };

      res.status(200).set({
        'Access-Control-Allow-Origin': 'http://www.longestpoemintheworld.com'
      }).send(JSON.stringify(result));
    });
  });
};

function fetchVerses(page, callback) {
  var versesPerPage = 16;

  var query = datastore.createQuery('Verse');
  query.order('timestamp', {
    descending: true
  });
  query.limit(versesPerPage);

  datastore.runQuery(query, function(err, entities) {
    if (!err) {
      callback(entities, null);
    } else {
      callback(null, err);
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