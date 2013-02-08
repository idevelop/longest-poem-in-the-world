$(function() {
	var tweetTemplate = Hogan.compile($("#tweetTemplate").html());
	var start = 0;

	function initClouds() {
		var number = 6;
		var minTopPosition = 40;
		var maxTopPosition = 600;
		var lastTopPosition = 0;

		function createCloud() {
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
				x: document.width - 200,
				duration: transitionDuration,
				easing: "linear"
			});

			setTimeout(function() {
				destroyCloud(cloud, cloudContainer);
			}, transitionDuration - 1000);
		}

		function destroyCloud(cloud, container) {
			cloud.animate({
				opacity: 0
			}, 1000);

			setTimeout(createCloud, 3000 + Math.floor(Math.random() * 3000));
		}

		var startTimeout = 0;
		for (var i = 0; i < number; i++) {
			setTimeout(createCloud, startTimeout);
			startTimeout += 4000 + Math.floor(Math.random() * 5000);
		}
	}

	function fetchVerses(start, callback) {
		$.get("http://127.0.0.1:3000?start=" + start, function(data) {
			$("#total").html(data.total);

			var versesHtml = '';
			for (var i = 0; i < data.verses.length; i++) {
				versesHtml += tweetTemplate.render(data.verses[i]);
			}
			$("#verses").html(versesHtml);
		});
	}

	fetchVerses(0);
	initClouds();

	$("#more > a").click(function(e) {
		e.preventDefault();
		start = start + 20;
		fetchVerses(start);
	});
});