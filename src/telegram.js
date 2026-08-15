// ═══════════════════════════════════════════════════════════════════════════════
// TELEGRAM API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const config = require('./config');

async function tgRequest(method, body = null) {
  const url = config.TG_API + '/' + method;
  const options = { method: 'POST' };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  return res.json();
}

async function sendTelegramMessage(chatId, text) {
  return tgRequest('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

async function notifyMistress(text) {
  if (!config.MISTRESS_CHAT_ID) return;
  return sendTelegramMessage(config.MISTRESS_CHAT_ID, text);
}

async function answerCallbackQuery(queryId, text, showAlert = false) {
  return tgRequest('answerCallbackQuery', {
    callback_query_id: queryId,
    text,
    show_alert: showAlert
  });
}

async function editMessageCaption(chatId, messageId, caption) {
  return tgRequest('editMessageCaption', {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: 'HTML'
  });
}

async function getFile(fileId) {
  const res = await fetch(config.TG_API + '/getFile?file_id=' + fileId);
  return res.json();
}

async function getBotInfo() {
  const res = await fetch(config.TG_API + '/getMe');
  return res.json();
}

module.exports = {
  tgRequest,
  sendTelegramMessage,
  notifyMistress,
  answerCallbackQuery,
  editMessageCaption,
  getFile,
  getBotInfo
};
