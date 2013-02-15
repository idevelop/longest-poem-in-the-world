var fs = require("fs");
var dict = fs.readFileSync("cmudict.txt", "utf8").split("\n");
var results = [];

dict.map(function(line) {
	var tokens = line.split("  ");
	var word = tokens[0].split("(")[0];
	var translation = tokens[1];
	results.push({
		word: word.toLowerCase(),
		translation: translation.toLowerCase()
	});
});

console.log(JSON.stringify(results, null, '\t'));