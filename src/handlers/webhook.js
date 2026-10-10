// ═══════════════════════════════════════════════════════════════════════════════
// TELEGRAM WEBHOOK HANDLER (V3 - COMPLETE & SAFE)
// ═══════════════════════════════════════════════════════════════════════════════
const config = require('../config');
const db = require('../db');
const tg = require('../telegram');
const { generateUploadToken } = require('../utils');
const reviews = require('./reviews');
const { t_bot } = require('./bot_i18n');
// Deduplication cache (in-memory, resets on deploy)
const processedUpdates = new Set();

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WEBHOOK ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
async function handleWebhook(update) {
  try {
    // Deduplication
    if (update.update_id) {
      if (processedUpdates.has(update.update_id)) return;
      processedUpdates.add(update.update_id);
      if (processedUpdates.size > 1000) processedUpdates.clear();
    }

    // Callback Query (Inline Keyboard from channel)
    if (update.callback_query) {
      return await handleCallbackQuery(update.callback_query);
    }

    // /start command
    if (update.message && update.message.text && update.message.text.startsWith('/start')) {
      return await handleStartCommand(update.message);
    }

    // Media upload
    if (update.message && (update.message.photo || update.message.video || update.message.document)) {
      return await handleMediaUpload(update.message);
    }
  } catch (error) {
    console.log('[handleWebhook FATAL]', error.message);
    console.log(error.stack);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// /start COMMAND
// ═══════════════════════════════════════════════════════════════════════════════
async function handleStartCommand(message) {
  const parts = message.text.split(' ');
  const payload = parts[1] || '';
  const chatId = message.chat.id;

  console.log('[handleStartCommand] chatId:', chatId, '| payload:', payload);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. إذا لم يكن هناك payload → اختيار اللغة أو ترحيب
  // ═══════════════════════════════════════════════════════════════════════════
  if (!payload) {
    let botUser = null;
    try {
      botUser = await db.getBotUser(chatId);
    } catch (e) {
      console.log('[handleStartCommand] db.getBotUser failed:', e.message);
    }

    // ✅ مستخدم لديه لغة محفوظة
    if (botUser && botUser.language) {
      const lang = botUser.language;
      const t = (k) => t_bot(lang, k);
      
      if (String(chatId) === String(config.MISTRESS_CHAT_ID)) {
        return tg.sendTelegramMessage(chatId, t('welcome_mistress'));
      }
      return tg.sendTelegramMessage(chatId, t('welcome_returning'));
    }

    // ✅ مستخدم جديد → عرض أزرار اختيار اللغة
    const welcomeMessage = 
      '🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\n' +
      '🌐 اختر اللغة / Choose your language';

    const keyboard = {
      inline_keyboard: [[
        { text: '🇸🇦 العربية', callback_data: 'lang:ar' },
        { text: '🇬🇧 English', callback_data: 'lang:en' }
      ]]
    };

    try {
      return await tg.sendTelegramMessageWithKeyboard(chatId, welcomeMessage, keyboard);
    } catch (e) {
      console.log('[handleStartCommand] sendWithKeyboard failed:', e.message);
      return tg.sendTelegramMessage(chatId, welcomeMessage);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. معالجة UPLOAD_ token
  // ═══════════════════════════════════════════════════════════════════════════
  if (payload.startsWith('UPLOAD_')) {
    const tokenStr = payload.replace('UPLOAD_', '');
    const token = await db.findToken(tokenStr);
    
    let lang = 'ar';
    try {
      const botUser = await db.getBotUser(chatId);
      if (botUser && botUser.language) lang = botUser.language;
    } catch (e) {
      console.log('[handleStartCommand] token db error:', e.message);
    }
    
    const t = (k) => t_bot(lang, k);

    if (!token) {
      return tg.sendTelegramMessage(chatId, t('invalid_token'));
    }

    if (token.used) {
      return tg.sendTelegramMessage(chatId, t('token_used'));
    }

    if (!token.chat_id) {
      await db.updateToken(tokenStr, { chat_id: String(chatId) });
      return tg.sendTelegramMessage(chatId, t('session_linked'));
    }

    if (String(token.chat_id) === String(chatId)) {
      return tg.sendTelegramMessage(chatId, t('session_already_linked'));
    }

    return tg.sendTelegramMessage(chatId, t('token_in_use'));
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA UPLOAD HANDLER (with safe fallbacks)
// ═══════════════════════════════════════════════════════════════════════════════
async function handleMediaUpload(message) {
  const chatId = message.chat.id;
  
  try {
    const token = await db.findActiveTokenByChatId(chatId);
    const botUser = await db.getBotUser(chatId);
    const lang = botUser?.language || 'ar';
    const t = (k) => t_bot(lang, k);

    if (!token) {
      return tg.sendTelegramMessage(chatId, t('no_active_session'));
    }

    let fileId = '';
    let method = 'sendDocument';

    if (message.photo) {
      fileId = message.photo[message.photo.length - 1].file_id;
      method = 'sendPhoto';
    } else if (message.video) {
      fileId = message.video.file_id;
      method = 'sendVideo';
    } else if (message.document) {
      fileId = message.document.file_id;
    } else {
      return tg.sendTelegramMessage(chatId, t('unsupported_file'));
    }

    const slaveCaption = message.caption || '';

    // جلب نص المهمة باللغة المختارة
    let taskDesc = 'N/A';
    let taskPoints = 0;
    try {
      if (token.task_id) {
        const taskMatch = token.task_id.match(/lv(\d+)_/);
        if (taskMatch) {
          const levelNum = parseInt(taskMatch[1]);
          const tasks = await db.getTasksForLevel(levelNum);
          const task = tasks.find(x => x.task_id === token.task_id);
          if (task) {
            taskDesc = (lang === 'ar') ? task.description_ar : task.description_en;
            taskPoints = task.points || 0;
          }
        }
      }
    } catch (e) {
      console.log('[task fetch] failed:', e.message);
    }

    const reviewId = 'R' + Date.now();
    const now = new Date().toISOString();

    // ✅ caption بلغة المستخدم فقط، بدون عقوبة
    let caption = '';
    caption += '📋 ' + t('caption_task') + ':\n' + taskDesc + '\n';
    caption += '━━━━━━━━━━━━━━━━━━━━\n';
    caption += '👤 ' + t('caption_slave') + ': <code>' + token.user_id + '</code>\n';
    if (slaveCaption) {
      caption += '━━━━━━━━━━━━━━━━━━━━\n';
      caption += '💬 ' + t('caption_note') + ':\n' + slaveCaption;
    }
    if (caption.length > 1024) {
      caption = caption.substring(0, 1020) + '...';
    }

    const inlineKeyboard = {
      inline_keyboard: [[
        { text: '✅ Accept', callback_data: 'A:' + reviewId },
        { text: '❌ Reject', callback_data: 'R:' + reviewId }
      ]]
    };

    const payload = {
      chat_id: config.CHANNEL_ID,
      caption,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    };
    payload[method === 'sendPhoto' ? 'photo' : (method === 'sendVideo' ? 'video' : 'document')] = fileId;

    const fwdRes = await fetch(config.TG_API + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const fwdJson = await fwdRes.json();
    console.log('[FORWARD]', fwdJson.ok ? 'SUCCESS' : fwdJson.description);

    if (!fwdJson.ok) {
      await tg.sendTelegramMessage(chatId, t('upload_failed'));
      return;
    }

    const channelMsgId = fwdJson.result.message_id;

    let directUrl = '';
    try {
      const fileJson = await tg.getFile(fileId);
      if (fileJson.ok) {
        directUrl = 'https://api.telegram.org/file/bot' + config.BOT_TOKEN + '/' + fileJson.result.file_path;
      }
    } catch (e) { console.log('[getFile] failed:', e.message); }

    try {
      await db.createReview({
        review_id: reviewId,
        user_id: token.user_id,
        task_id: token.task_id,
        file_id: fileId,
        media_url: directUrl,
        slave_chat_id: String(chatId),
        status: 'pending',
        timestamp: now,
        channel_message_id: String(channelMsgId)
      });
    } catch (e) { console.log('[createReview] failed:', e.message); }

    await db.updateToken(token.token, { used: true });
    await tg.sendTelegramMessage(chatId, t('upload_success'));

  } catch (error) {
    console.log('[MEDIA FATAL]', error.message);
    try {
      await tg.sendTelegramMessage(chatId, '⚠️ Error');
    } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALLBACK QUERY HANDLER (Accept/Reject buttons)
// ═══════════════════════════════════════════════════════════════════════════════
async function handleCallbackQuery(callbackQuery) {
  const data = callbackQuery.data || '';
  const fromId = callbackQuery.from.id;
  const queryId = callbackQuery.id;
  const chatId = callbackQuery.message.chat.id;

  try {
    // ✅ معالجة اختيار اللغة
    if (data.startsWith('lang:')) {
      const lang = data.split(':')[1];
      if (lang !== 'ar' && lang !== 'en') {
        return tg.answerCallbackQuery(queryId, '❌ Invalid', true);
      }
      await db.upsertBotUser(chatId, { language: lang });
      const t = (k) => t_bot(lang, k);
      await tg.answerCallbackQuery(queryId, t('language_set'), false);
      await tg.sendTelegramMessage(chatId, t('language_set'));
      return;
    }

    // ✅ Security: only Mistress for accept/reject
    if (String(fromId) !== String(config.MISTRESS_CHAT_ID)) {
      return tg.answerCallbackQuery(queryId, '⛔ Unauthorized', true);
    }

    const parts = data.split(':');
    if (parts.length < 2) {
      return tg.answerCallbackQuery(queryId, '⚠️ Invalid', true);
    }

    const action = parts[0] === 'A' ? 'accept' : 'reject';
    const reviewId = parts[1];

    const result = await reviews.processReview(reviewId, action, 'Mistress');
    const answerText = result.success
      ? (action === 'accept' ? '✅ Approved' : '❌ Rejected')
      : '⚠️ ' + (result.message || 'Error');

    return tg.answerCallbackQuery(queryId, answerText);
  } catch (error) {
    console.log('[callback FATAL]', error.message);
    return tg.answerCallbackQuery(queryId, '⚠️ Server error', true);
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS (⚠️ ضروري جداً)
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = { handleWebhook };
