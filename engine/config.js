var fs = require("fs");

exports.read = function(configName) {
	var config = null;

	try {
		config = JSON.parse(fs.readFileSync("config/" + configName + ".json", "utf8"));
	} catch (e) {
		console.log("Error reading " + configName + ".json : " + e);
		process.exit(1);
	}

	return config;
};
