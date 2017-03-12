Longest Poem in the World
=========================

[The Longest Poem in the World](http://www.longestpoemintheworld.com) is a continuous stream of real-time tweets that rhyme.

## How it works

<img src="http://www.longestpoemintheworld.com/images/birdie_github.png" align="right" />

* The [Twitter Search API](https://dev.twitter.com/docs/api/1.1/get/search/tweets) is used to fetch 100 recent English tweets.
* Out of those tweets it only considers those written in proper English and with a reasonable syllable count.
* The [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict) is used to obtain phonetical translations of the tweet. For example, `orange` has the phonetical translation `ao1 r ah0 n jh`. Tweets that rhyme have the same phonetical translation starting with the last accented phoneme.
* A backlog of tweet candidates is kept. For each tweet ("candidate") fetched from the public search stream, it looks in the backlog to see if it can find one that rhymes with it. If yes, it pushes both tweets into the poem's verse stream. If not, the tweet is saved in the backlog, waiting to be paired with a future candidate.
* Additional improvements include: ignoring "same word" rhymes, translating numbers into plain text, ignoring smileys, etc.

## Setup

In order for the application to be able to access the Twitter Search API, you need to provide the necessary API access tokens. Go to [Twitter's developer portal](https://dev.twitter.com/apps), sign in with your Twitter account and create a new application. At the bottom of the app page click the "Create my access token" button, then go to the "OAuth tool" tab and copy the 4 OAuth tokens into the `twitter.json` file in `cloud/storage`.

You then need to set up the Google Cloud Platform:
* Create a new Google Cloud Platform project
* Create a PubSub channel named `tweets`
* Create 3 cloud functions, one for each of the folders in `cloud/functions`, paste the contents of the js file and the package.json for each.
    * `fetch-tweets` uses the Twitter API to fetch tweets, filter to only reasonable candidates, then push each candidate to the `tweets` PubSub channel
    * `parse-tweet` is called for each new candidate on the PubSub channel and tries to pair it with an older rhyming tweet
    * `list-verses` is used by the website to list the most recent verses of the poem
* Upload the `cloud/storage/twitter.json` file into the Google Storage bucket created for your project
* Set up a cron job to call the `fetch-tweets` function however often you like. I use [UptimeRobot](uptimerobot.com) with a frequency of 5 minutes.

## Author

**Andrei Gheorghe**

* [About me](http://idevelop.github.com)
* LinkedIn: [linkedin.com/in/idevelop](http://www.linkedin.com/in/idevelop)
* Twitter: [@idevelop](http://twitter.com/idevelop)

## License

- The "Longest Poem in the World" code is licensed under the MIT License.
- The [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict) is Public Domain.
- Tweets are property of their respective authors
