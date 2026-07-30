import { createNodexBot } from "@nodex/telegram";

const result = createNodexBot("support", process.env.TELEGRAM_SUPPORT_BOT_TOKEN);
if (!result.enabled) console.info("Support bot disabled locally: missing token");
else await result.bot.start();
