Parse.Cloud.define("appendTweetsToPoem", function(request, response) {
  // This function lives on the Parse CloudCode API layer
  // It creates Tweet objects with Public Read ACL
  
  var TweetClass = Parse.Object.extend("Tweet");
  var objectsToSave = [];

  var acl = new Parse.ACL();
  acl.setPublicWriteAccess(false);
  acl.setPublicReadAccess(true);

  request.params.tweets.map(function(tweet) {
    var t = new TweetClass({
      ACL: acl
    });

    t.set("tweet", tweet.id);
    t.set("author", tweet.author);
    t.set("username", tweet.username);
    t.set("text", tweet.text);

    objectsToSave.push(t);
  });

  Parse.Object.saveAll(objectsToSave, {
    success: function(list) {
      response.success(true);
    },
    error: function(error) {
      response.error(error);
    },
  });
});
