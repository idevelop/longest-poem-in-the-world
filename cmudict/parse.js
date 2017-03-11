var fs = require("fs");

// this script converts the CMU Dictionary stored in cmudict.txt to cmudict.json

var words = fs.readFileSync("cmudict.txt", "utf8").split("\n");
var dictionary = {};

words = words.filter(function(line) {
  var c = line.toLowerCase().charCodeAt(0)
  return c > 96 && c < 123
}).map(function(line) {
  var tokens = line.split("  ");
  var word = tokens[0].split("(")[0];
  var translation = tokens[1];

  dictionary[word.toLowerCase()] = getRelevantPhoneme(translation.toLowerCase());
});

fs.writeFileSync("cmudict.json", JSON.stringify(dictionary), "utf8");

console.log("Converted cmudict.txt to cmudict.json.");

function getRelevantPhoneme(phoneticalTranslation) {
  var lastAccentPosition = phoneticalTranslation.lastIndexOf("1");
  if (lastAccentPosition == -1) lastAccentPosition = phoneticalTranslation.lastIndexOf("0");

  var groupStartPosition = phoneticalTranslation.substr(0, lastAccentPosition).lastIndexOf(" ");
  phoneticalTranslation = phoneticalTranslation.substr(groupStartPosition + 1);

  return phoneticalTranslation;
}
