var fs = require("fs");

exports.read = function(configName) {
	var config = null;
	
	try {
		config = JSON.parse(fs.readFileSync(configName + ".config", "utf8"));
	} catch (e) {
		console.log("Error reading " + configName + ".config : " + e);
		process.exit(1);
	}

	return config;
};
