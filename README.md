Longest Poem in the World
=========================

[The Longest Poem in the World](http://www.longestpoemintheworld.com) is a continuous stream of real-time tweets that rhyme.

## How it works

<img src="http://www.longestpoemintheworld.com/images/birdie_github.png" align="right" />

* The [Twitter Streaming API v1.1](https://dev.twitter.com/docs/api/1.1/post/statuses/filter) is used to fetch tweets in real-time. Out of the tweets coming from the stream it only considers those written in proper English and with a reasonable syllable count. 
* The [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict) is used to obtain phonetical translations of the tweet. For example, `orange` has the phonetical translation `ao1 r ah0 n jh`. Words that rhyme have the same phonetical translation starting with the last accented phoneme. 
* A backlog of tweet candidates is kept. For each tweet ("candidate") fetched from the stream, it looks in the backlog to see if it can find one that rhymes with it. If yes, it pushes both tweets into the poem's verse stream. If not, the tweet is saved in the backlog, waiting to be paired with a future candidate.
* Additional improvements include: ignoring "same word" rhymes, translating numbers into plain text, ignoring smileys, etc.

## Installation

1. Clone the repository
2. Make sure you have a running Redis instance
3. Install dependencies: `npm install`

## Usage

In order for the application to be able to access the Twitter Search API, you need to provide the necessary API access tokens. Go to [Twitter's developer portal](https://dev.twitter.com/apps), sign in with your Twitter account and create a new application. At the bottom of the app page click the "Create my access token" button, then go to the "OAuth tool" tab and copy the 4 OAuth tokens into the `app.config` JSON file.

To start the poem generator, run `node engine`.

The verse stream is not stored anywhere, and is only published via Redis pub/sub to clients subscribed to the channel.

## API

A simple, read-only socket.io API is provided in the `api` folder. It is currently used by the [application homepage](http://www.longestpoemintheworld.com) to list the verses. I plan to allow outside submissions into the verse stream in the form of an API request containing a pair of tweet ids.

To start the API server, run `node api`.

## Dependencies

* The application requires a running Redis instance.
* socket.io is used by the API to push the verse stream to the browser in real-time

## Author

**Andrei Gheorghe**

* LinkedIn: [linkedin.com/in/idevelop](http://www.linkedin.com/in/idevelop)
* Twitter: [@idevelop](http://twitter.com/idevelop)

## License

- The "Longest Poem in the World" code is licensed under the MIT License.
- The [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict) is Public Domain.
