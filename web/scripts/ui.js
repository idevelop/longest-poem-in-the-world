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
		apiEndpoint: "https://us-central1-longest-poem-in-the-world.cloudfunctions.net/list-verses",

		init: function() {
			ui.verses.template = $("#verseTemplate").html();

			// http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
			ui.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;

			$("#more > a").click(function(e) {
				e.preventDefault();
				ui.verses.fetch($("#more").attr("data-cursor"));
			});

			ui.verses.fetch();
		},

		fetch: function(cursor) {
			$("#loading").show();
			$("#more").hide();

			var url = ui.verses.apiEndpoint;
			if (cursor) {
				url += "?cursor=" + cursor;
			}

			$.get(url, function(data) {
				// TODO: check success
				ui.verses.render(data.verses);
				$("#total").html(ui.verses.formatTotal(data.total));
				$("#loading").hide();
				$("#more").attr("data-cursor", encodeURIComponent(data.cursor)).show();
			}, "json");
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
