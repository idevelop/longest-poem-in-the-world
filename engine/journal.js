var fs = require("fs");
const crlf = "\r\n";

exports.info = function(text) {
	fs.appendFile('./info.log', timestamp() + ": " + text + crlf);
};

exports.error = function(text) {
	fs.appendFile('./error.log', timestamp() + ": " + text + crlf);
};

function timestamp() {
	return (new Date()).toString();
}