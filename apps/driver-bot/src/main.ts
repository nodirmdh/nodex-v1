import { createNodexBot } from "@nodex/telegram";

const result = createNodexBot("driver", process.env.TELEGRAM_DRIVER_BOT_TOKEN);
if (!result.enabled) console.info("Driver bot disabled locally: missing token");
else await result.bot.start();
