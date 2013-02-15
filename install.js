var fs = require("fs");
var dictionary = require("./engine/dictionary");

// this script populates the dictionary with the CMU Dictionary stored in the JSON file cmudict.json

var words = JSON.parse(fs.readFileSync("./cmudict/cmudict.json", "utf8"));
console.log("Inserting " + words.length + " words into the dictionary...");

for (var i = 0; i < words.length; i++) {
	dictionary.insert(words[i]);
}

dictionary.close();
