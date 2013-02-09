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
				x: $("body").width() - 200,
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
			});

			setTimeout(ui.clouds.createCloud, 3000 + Math.floor(Math.random() * 3000));
		}
	},

	verses: {
		init: function() {
			ui.verses.template = $("#verseTemplate").html();
			ui.verses.streamPosition = 0;
			ui.verses.perPage = 16;

			$("#more > a").click(function(e) {
				e.preventDefault();
				ui.verses.streamPosition += ui.verses.perPage;
				ui.verses.fetch();
			});

			ui.verses.fetch();
		},

		fetch: function(start) {
			$.getJSON("http://api.longestpoemintheworld.com?start=" + ui.verses.streamPosition + "&count=" + ui.verses.perPage , function(data) {
				ui.verses.render(data);
				$("#more").show();
			}).fail(function() {
				// fallback to cache
				ui.verses.fetchCache();
			});
		},

		fetchCache: function() {
			$.getJSON("http://www.longestpoemintheworld.com/cache.json", ui.verses.render);
		},

		render: function(data) {
			$("#total").html(ui.verses.formatTotal(data.total));

			var versesHtml = '';
			for (var i = 0; i < data.verses.length; i++) {
				versesHtml += ui.verses.template.format(data.verses[i].user, data.verses[i].id, data.verses[i].name, data.verses[i].text);
			}

			$("#verses").html(versesHtml);
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
