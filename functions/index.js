const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

const cheerio = require('cheerio');
const getUrls = require('get-urls');
const fetch = require('node-fetch');

const scrape = post => {
    try {
        const links = Array.from(getUrls(post));
        const requests = links.map(async link => {
            const res = await fetch(link);

            const html = await res.text();
            const $ = cheerio.load(html);

            // meta tag scraper closure function
            const extractMetaTags = () => {
                const tags = {}

                $("meta").each((index, elm) => {
                    let name = $(elm).attr('name') || $(elm).attr('property') || $(elm).attr('itemprop') || $(elm).attr('charset');
                    let content = $(elm).attr('content') || null;
                    tags[name] = content;
                    return;
                });

                return tags;
            }

            return {
                link,
                title: $('title').first().text() || null,
                favicon: $('link[rel="shortcut icon"]').attr('href') || $('link[rel="icon"]').attr('href') || null,
                meta: extractMetaTags()
            }
        });

        return Promise.all(requests);
    } catch (err) {
        return err;
    }
}

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

exports.scraper = functions.https.onRequest((request, response) => {
    cors(request, response, async () => {
        try {
            const body = JSON.parse(request.body);
            const data = await scrape(body.text);

            response.send(data);
        } catch (err) {
            response.send(err);
        }
    });
});