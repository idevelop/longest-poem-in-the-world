var redis = require("redis").createClient();
var journal = require("./journal");

redis.on("error", function (error) {
	if (error.toString().indexOf("ECONNREFUSED") != -1) {
		console.log("Error: redis server offline.");
		process.exit(1);
	}

	journal.error("redis: " + error);
});

exports.insert = function(record) {
	// TODO: allow multiple phonetical translations for same word
	redis.hset("longestpoem.dictionary", record.word, record.translation);
};

exports.getMultiple = function(words, callback) {
	// takes array of words, returns array of phonetical translations for each word
	redis.hmget("longestpoem.dictionary", words, function(error, result) {
		if (error) return journal.error(error);

		callback(result);
	});
};

exports.close = function() {
	// should only be called manually when the application is closing
	redis.quit();
};