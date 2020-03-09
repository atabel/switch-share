const url = require("url");
const http = require("http");
const ngrok = require("ngrok");
const { Autohook, validateWebhook } = require("twitter-autohook");

const PORT = process.env.PORT || 4242;
const config = {
  token: process.env.TWITTER_ACCESS_TOKEN,
  token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  env: process.env.TWITTER_WEBHOOK_ENV
};

const startServer = onEvent =>
  http
    .createServer((req, res) => {
      const route = url.parse(req.url, true);

      if (!route.pathname) {
        return;
      }

      if (route.query.crc_token) {
        const crc = validateWebhook(route.query.crc_token, config, res);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(crc));
      } else {
        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });
        req.on("end", () => {
          if (body) {
            onEvent(JSON.parse(body));
          }
          res.writeHead(200);
          res.end();
        });
      }
    })
    .listen(PORT);

const listen = async cb => {
  const webhookUrl = await ngrok.connect(PORT);

  startServer(cb);

  const webhook = new Autohook(config);

  // Remove old webhooks
  await webhook.removeWebhooks();

  // Add the new webhook
  await webhook.start(webhookUrl);

  cb("Twitter webhook created");

  // Subscribes to a user's activity
  try {
    await webhook.subscribe({
      oauth_token: config.token,
      oauth_token_secret: config.token_secret
    });
  } catch (e) {
    await cb("Error subscribing :(");
    throw e;
  }
  cb("Subscribed to new tweets!");
};

module.exports = listen;
