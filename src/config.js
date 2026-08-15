// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG — يقرأ من Environment Variables فقط
// ═══════════════════════════════════════════════════════════════════════════════
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,

  // Telegram
  BOT_TOKEN: process.env.BOT_TOKEN,
  MISTRESS_CHAT_ID: process.env.MISTRESS_CHAT_ID,
  CHANNEL_ID: process.env.CHANNEL_ID,
  MASTER_PASSWORD: process.env.MASTER_PASSWORD,

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || '*',

  // Derived
  get TG_API() { return 'https://api.telegram.org/bot' + this.BOT_TOKEN; }
};
