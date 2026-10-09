// ═══════════════════════════════════════════════════════════════════════════════
// TELEGRAM WEBHOOK HANDLER (V3 - COMPLETE & SAFE)
// ═══════════════════════════════════════════════════════════════════════════════
const config = require('../config');
const db = require('../db');
const tg = require('../telegram');
const { generateUploadToken } = require('../utils');
const reviews = require('./reviews');

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
const { t_bot } = require('./bot_i18n');

async function handleStartCommand(message) {
  const parts = message.text.split(' ');
  const payload = parts[1] || '';
  const chatId = message.chat.id;
  
  // ✅ إذا لم يكن هناك payload، اعرض اختيار اللغة
  if (!payload) {
    const botUser = await db.getBotUser(chatId);
    const lang = botUser?.language || 'ar';
    const t = (k) => t_bot(lang, k);
    
    // إذا كانت المسيطرة
    if (String(chatId) === String(config.MISTRESS_CHAT_ID)) {
      return tg.sendTelegramMessage(chatId, t('welcome_mistress'));
    }
    
    // عرض اختيار اللغة مع أزرار
    const keyboard = {
      inline_keyboard: [[
        { text: '🇸🇦 العربية', callback_data: 'lang:ar' },
        { text: '🇬🇧 English', callback_data: 'lang:en' }
      ]]
    };
    
    return tg.sendTelegramMessageWithKeyboard(chatId, t('welcome') + '\n\n' + t('choose_language'), keyboard);
  }
  
  // معالجة UPLOAD_ token
  if (payload.startsWith('UPLOAD_')) {
    const tokenStr = payload.replace('UPLOAD_', '');
    const token = await db.findToken(tokenStr);
    const botUser = await db.getBotUser(chatId);
    const lang = botUser?.language || 'ar';
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
  console.log('[MEDIA] from:', chatId);

  try {
    // Find active token
    const token = await db.findActiveTokenByChatId(chatId);
    if (!token) {
      return tg.sendTelegramMessage(chatId, '❌ لا توجد جلسة نشطة. ابدأ من الموقع.');
    }

    // Extract file_id
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
      return tg.sendTelegramMessage(chatId, '❌ نوع الملف غير مدعوم.');
    }

    // Get slave's caption (if any)
    const slaveCaption = message.caption || '';

    // Fetch task details safely (with fallback)
    let taskDescAr = 'غير متوفر';
    let taskDescEn = 'N/A';
    let taskPunishment = 'غير متوفر';
    let taskReward = 'غير متوفر';
    let taskPoints = 0;

    try {
      if (token.task_id) {
        const taskMatch = token.task_id.match(/lv(\d+)_/);
        if (taskMatch) {
          const levelNum = parseInt(taskMatch[1]);
          const tasks = await db.getTasksForLevel(levelNum);
          if (tasks && tasks.length > 0) {
            const task = tasks.find(t => t.task_id === token.task_id);
            if (task) {
              taskDescAr = task.description_ar || 'غير متوفر';
              taskDescEn = task.description_en || 'N/A';
              taskPunishment = task.punishment || 'غير متوفر';
              taskReward = task.reward || 'غير متوفر';
              taskPoints = task.points || 0;
            }
          }
        }
      }
    } catch (e) {
      console.log('[task fetch] failed:', e.message);
    }

    const reviewId = 'R' + Date.now();
    const now = new Date().toISOString();

    // Build rich caption (with length limit)
   // Build minimal caption: only description + punishment + slave note
let caption = '';
caption += '📝 ' + taskDescAr + '\n';
if (taskDescEn && taskDescEn !== 'N/A') {
  caption += '📝 ' + taskDescEn + '\n';
}
caption += '━━━━━━━━━━━━━━━━━━━━\n';
caption += '⚠️ العقوبة: ' + taskPunishment + '\n';

if (slaveCaption) {
  caption += '━━━━━━━━━━━━━━━━━━━━\n';
  caption += '💬 ملاحظة الخاضع: ' + slaveCaption;
}

// Ensure caption doesn't exceed Telegram limit (1024)
if (caption.length > 1024) {
  caption = caption.substring(0, 1020) + '...';
}

    const inlineKeyboard = {
      inline_keyboard: [[
        { text: '✅ Accept', callback_data: 'A:' + reviewId },
        { text: '❌ Reject', callback_data: 'R:' + reviewId }
      ]]
    };

    // Build payload
    const payload = {
      chat_id: config.CHANNEL_ID,
      caption,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    };
    payload[method === 'sendPhoto' ? 'photo' : (method === 'sendVideo' ? 'video' : 'document')] = fileId;

    // Forward to channel
    const fwdRes = await fetch(config.TG_API + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const fwdJson = await fwdRes.json();
    console.log('[FORWARD]', fwdJson.ok ? 'SUCCESS' : fwdJson.description);

    if (!fwdJson.ok) {
      console.log('[FORWARD ERROR]', JSON.stringify(fwdJson));
      await tg.sendTelegramMessage(chatId, '❌ فشل الإرسال: ' + fwdJson.description);
      return;
    }

    const channelMsgId = fwdJson.result.message_id;

    // Get file URL
    let directUrl = '';
    try {
      const fileJson = await tg.getFile(fileId);
      if (fileJson.ok) {
        directUrl = 'https://api.telegram.org/file/bot' + config.BOT_TOKEN + '/' + fileJson.result.file_path;
      }
    } catch (e) {
      console.log('[getFile] failed:', e.message);
    }

    // Save to Supabase (with safe try/catch)
    try {
      const reviewData = {
        review_id: reviewId,
        user_id: token.user_id,
        task_id: token.task_id,
        file_id: fileId,
        media_url: directUrl,
        slave_chat_id: String(chatId),
        status: 'pending',
        timestamp: now,
        channel_message_id: String(channelMsgId)
      };

      // Only add slave_caption if the column exists
      // (we'll test with a simple try first)
      reviewData.slave_caption = slaveCaption;

      await db.createReview(reviewData);
      console.log('[createReview] SUCCESS');
    } catch (e) {
      console.log('[createReview] failed:', e.message);
      // Retry without slave_caption
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
        console.log('[createReview] SUCCESS (without slave_caption)');
      } catch (e2) {
        console.log('[createReview] FATAL:', e2.message);
      }
    }

    await db.updateToken(token.token, { used: true });

    // Confirm to slave
    await tg.sendTelegramMessage(chatId, '✅ <b>تم استلام الإثبات!</b>\nReview ID: ' + reviewId);

    // Notify Mistress
    if (String(chatId) !== String(config.MISTRESS_CHAT_ID)) {
      await tg.notifyMistress('📎 New Proof\nReview: ' + reviewId + '\nSlave: ' + token.user_id);
    }

  } catch (error) {
    console.log('[MEDIA FATAL ERROR]', error.message);
    console.log(error.stack);
    try {
      await tg.sendTelegramMessage(chatId, '⚠️ حدث خطأ في المعالجة. حاول مرة أخرى.');
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

  // ✅ Security check
  if (String(fromId) !== String(config.MISTRESS_CHAT_ID)) {
    try {
      await tg.answerCallbackQuery(queryId, '⛔ Unauthorized.', true);
    } catch (e) { console.log('[answer] failed:', e.message); }
    return;
  }

  const parts = data.split(':');
  if (parts.length < 2) {
    try {
      await tg.answerCallbackQuery(queryId, '⚠️ Invalid action', true);
    } catch (e) { console.log('[answer] failed:', e.message); }
    return;
  }

  const action = parts[0] === 'A' ? 'accept' : 'reject';
  const reviewId = parts[1];

  // ✅ Answer callback FIRST (before any heavy work)
  // هذا يُغلق نافذة "loading" في تلغرام فوراً
  let answerText = action === 'accept' ? '✅ Processing...' : '❌ Processing...';
  try {
    await tg.answerCallbackQuery(queryId, answerText);
  } catch (e) {
    console.log('[answerCallbackQuery early] failed:', e.message);
  }

  // ✅ Process review (after answering)
  try {
    const result = await reviews.processReview(reviewId, action, 'Mistress');
    console.log('[processReview]', JSON.stringify(result));
  } catch (error) {
    console.log('[processReview FATAL]', error.message);
    console.log(error.stack);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS (⚠️ ضروري جداً)
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = { handleWebhook };
