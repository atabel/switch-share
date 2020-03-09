require("dotenv").config();

const Telegraf = require("telegraf");
const listenTwitter = require("./twitter");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(ctx => {
  ctx.reply("Starting...");

  listenTwitter(event => {
    if (typeof event === "string") {
      ctx.reply(event);
    } else {
      if (event.tweet_create_events) {
        let media = [];

        for (const tweet of event.tweet_create_events) {
          if (tweet.extended_entities && tweet.extended_entities.media) {
            media = [...media, ...tweet.extended_entities.media]; // videos
          } else if (tweet.entities && tweet.entities.media) {
            media = [...media, ...tweet.entities.media]; // pictures
          }
        }

        const urls = media
          .map(m => {
            if (
              m.video_info &&
              m.video_info.variants &&
              m.video_info.variants.length
            ) {
              // Find the video with better bitrate
              let betterVariant = { bitrate: 0 };
              for (const variant of m.video_info.variants) {
                if (
                  variant.bitrate &&
                  variant.bitrate > betterVariant.bitrate
                ) {
                  betterVariant = variant;
                }
              }
              return betterVariant.url;
            } else {
              return m.media_url_https;
            }
          })
          .filter(Boolean);

        urls.forEach(url => {
          ctx.reply(url);
        });
      }
    }
  });
});

bot.launch();
