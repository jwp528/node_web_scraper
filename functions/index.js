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

            // returns the site name from proper meta tags, or the title
            const getSiteName = () => {
                return $('meta[property="og:site_name"]').attr('content') || $('title').first().text() || null;
            }

            const getFavicon = () => {
                return $('link[rel="shortcut icon"]').attr('href') || $('link[rel="icon"]').attr('href') || null;
            }

            const getSiteImage = () => {
                return $('meta[name="image"]').attr('Content') ||
                    $('meta[property="og:image"]').attr('Content') ||
                    $('meta[property="msapplication-TileImage"]').attr('Content') ||
                    null;
            }

            const getSiteDescription = () => {
                return $('meta[name="description"]').attr('Content') || null;
            }

            const extractMetaTags = () => {
                const tags = {}

                $("meta").each((index, elm) => {

                    // returns whether the tag used name, itemprop, property, etc
                    const findTagType = () => {
                        const validNames = ['name', 'property', 'itemprop', 'http-equiv'];
                        let found = null;
                        for (const name of validNames) {
                            if ($(elm).attr(name)) {
                                found = name;
                                break;
                            }
                        }

                        return found;
                    }
                    let name = $(elm).attr('name') || $(elm).attr('property') || $(elm).attr('itemprop') || $(elm).attr('charset');
                    const tagData = {
                        type: findTagType(),
                        content: $(elm).attr('content') || null
                    }
                    tags[name] = tagData;
                    return;
                });

                return tags;
            }

            return {
                link,
                title: getSiteName(),
                favicon: getFavicon(),
                image: getSiteImage(),
                description: getSiteDescription(),
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
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            const data = await scrape(body.text);
            response.send({ data });
        } catch (err) {
            console.error(err);
            response.send({ err });
        }
    });
});