var ui = {
	clouds: {
		init: function(number) {
			var startTimeout = 0;
			for (var i = 0; i < number; i++) {
				setTimeout(ui.clouds.createCloud, startTimeout);
				startTimeout += 4000 + Math.floor(Math.random() * 5000);
			}
		},

		createCloud: function() {
			var minTopPosition = 40;
			var maxTopPosition = 600;
			var lastTopPosition = 0;

			var cloudContainer = $('<span class="cloud" />');
			var cloud = $('<img src="images/cloud.png" />');
			cloud.appendTo(cloudContainer);

			do {
				topPosition = minTopPosition + Math.round(Math.random() * (maxTopPosition - minTopPosition));
			} while (Math.abs(topPosition - lastTopPosition) < 200);
			lastTopPosition = topPosition;

			cloudContainer.css({
				top: topPosition
			});

			cloud.css({
				zoom: Math.random() / 2 + 0.5
			});

			cloudContainer.appendTo("body");

			cloud.animate({
				opacity: Math.random() / 2 + 0.5
			}, 1000);

			var transitionDuration = 20000 + Math.floor(Math.random() * 50000);
			cloudContainer.transition({
				left: $("body").width() - 200,
				duration: transitionDuration,
				easing: "linear"
			});

			setTimeout(function() {
				ui.clouds.destroyCloud(cloud, cloudContainer);
			}, transitionDuration - 1000);
		},

		destroyCloud: function (cloud, container) {
			cloud.animate({
				opacity: 0
			}, 1000, function() {
				container.remove();
				setTimeout(ui.clouds.createCloud, 3000 + Math.floor(Math.random() * 3000));
			});
		}
	},

	verses: {
		perPage: 16,
		pauseStream: false,
		
		init: function() {
			ui.verses.template = $("#verseTemplate").html();
			ui.verses.container = $("#verses");
			ui.verses.current = 0;

			// http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
			ui.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;

			if (typeof io != "undefined") {
				ui.verses.socket = io.connect('http://www.longestpoemintheworld.com:3000');
				ui.verses.socket.on('verses', function (data) {
					$("#total").html(ui.verses.formatTotal(data.total));
					if (!ui.verses.pauseStream) ui.verses.push(data.couplet);
				});

				// pause the stream if mouse is over the verses
				ui.verses.container.hover(function() {
					ui.verses.pauseStream = true;
				}, function() {
					ui.verses.pauseStream = false;
				});
			} else {
				// api is down
				ui.verses.fetchCache(function() {
					$("#total").html(ui.verses.formatTotal(data.total));
					var verses = data.verses;
					for (var i = 0; i < verses.length; i++) {
						var text = (ui.isSafari) ? verses[i].text : ui.verses.stripEmoji(verses[i].text);
						var li = $.parseHTML(ui.verses.template.format(verses[i].user, verses[i].id, verses[i].name, text));
						$(li).appendTo(ui.verses.container).animate({
							opacity: 1
						}, 200);
					}
				});
			}
		},

		fetchCache: function(callback) {
			$.getJSON("http://www.longestpoemintheworld.com/cache.json", callback);
		},

		push: function(verses) {
			var versesHtml = '';
			for (var i = 0; i < verses.length; i++) {
				var text = (ui.isSafari) ? verses[i].text : ui.verses.stripEmoji(verses[i].text);
				var li = $.parseHTML(ui.verses.template.format(verses[i].user, verses[i].id, verses[i].name, text));
				$(li).appendTo(ui.verses.container).animate({
					opacity: 1
				}, 200);
			}

			if (ui.verses.current < ui.verses.perPage) {
				ui.verses.current += 2;
			} else {
				var v = ui.verses.container.find("li:not(.zombie)").slice(0, 2);
				v.addClass("zombie").animate({
					"opacity": 0,
					"height": 0
				}, 100, function() {
					$(this).remove();
				});
			}
		},

		formatTotal: function(number) {
			number = number.toString();

			var result = [];
			do {
				result.push(number.substr(-3));
				number = number.substr(0, number.length - 3);
			} while (number.length > 0);

			result.reverse();
			return result.join(",");
		},

		stripEmoji: function(text) {
			return text.split("").map(function(c) {
				var charCode = c.charCodeAt(0);
				return (charCode >= 50000) ? '' : c;
			}).join("");
		}
	},

	init: function() {
		ui.clouds.init(5);
		ui.verses.init();
	}
};

$(ui.init);

// http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) {
			return (typeof args[number] != 'undefined') ? args[number] : match;
		});
	};
}
