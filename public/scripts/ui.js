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
		init: function() {
 			Parse.initialize("KOilx1x2h0XEDW6G7kbNNwILuvWQpIRCNzC5dIPD", "Trny3PmLIieAPQV79QMiJbP2JKfGoRPl8D3ZERKq");
			ui.verses.template = $("#verseTemplate").html();
			ui.verses.streamPosition = 0;
			ui.verses.perPage = 16;

			// http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
			ui.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;

			$("#more > a").click(function(e) {
				e.preventDefault();
				ui.verses.streamPosition += ui.verses.perPage;
				ui.verses.fetch();
			});

			var query = new Parse.Query("Tweet");
			query.count({
			  success: function(total) {
					$("#total").html(ui.verses.formatTotal(total));
			  }
			});

			ui.verses.fetch();
		},

		fetch: function(start) {
			var query = new Parse.Query("Tweet");
			query.descending("createdAt");
			query.skip(ui.verses.streamPosition);
			query.limit(ui.verses.perPage);
			query.find({
			  success: function(tweets) {
			  	var verses = [];
			  	tweets.map(function(tweet) {
			  		verses.push({
			  			id: tweet.get("tweet"),
			  			text: tweet.get("text"),
			  			author: tweet.get("author"),
			  			username: tweet.get("username")
			  		})
			  	});

					ui.verses.render(verses);
					$("#more").show();
			  },
			  error: function(object, error) {
					console.log(error);
			  }
			});
		},

		render: function(verses) {
			var versesHtml = '';
			for (var i = 0; i < verses.length; i++) {
				var text = (ui.isSafari) ? verses[i].text : ui.verses.stripEmoji(verses[i].text);
				versesHtml += ui.verses.template.format(verses[i].username, verses[i].id, verses[i].author, text);
			}

			if ($("#verses li").length === 0) {
				$("#verses").html(versesHtml);
			} else {
				$("#verses").animate({
					opacity: 0
				}, 200, function() {
					$("#verses").html(versesHtml);
					$("#verses").animate({
						opacity: 1
					}, 200);
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
