// ═══════════════════════════════════════════════════════════════════════════════
// TELEGRAM WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
const config = require('../config');
const db = require('../db');
const tg = require('../telegram');
const { generateUploadToken } = require('../utils');
const reviews = require('./reviews');

// Deduplication cache (in-memory, resets on deploy)
const processedUpdates = new Set();

async function handleWebhook(update) {
  // Deduplication
  if (update.update_id) {
    if (processedUpdates.has(update.update_id)) return;
    processedUpdates.add(update.update_id);
    if (processedUpdates.size > 1000) processedUpdates.clear();
  }

  // Callback Query (Inline Keyboard from channel)
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query);
  }

  // /start command
  if (update.message?.text?.startsWith('/start')) {
    return handleStartCommand(update.message);
  }

  // Media upload
  if (update.message?.photo || update.message?.video || update.message?.document) {
    return handleMediaUpload(update.message);
  }
}

async function handleStartCommand(message) {
  const parts = message.text.split(' ');
  const payload = parts[1] || '';
  const chatId = message.chat.id;

  if (payload.startsWith('UPLOAD_')) {
    const tokenStr = payload.replace('UPLOAD_', '');
    const token = await db.findToken(tokenStr);

    if (!token) {
      return tg.sendTelegramMessage(chatId, '❌ رمز غير صالح. ابدأ من الموقع.');
    }

    if (token.used) {
      return tg.sendTelegramMessage(chatId, '❌ هذه الجلسة منتهية.');
    }

    if (!token.chat_id) {
      await db.updateToken(tokenStr, { chat_id: String(chatId) });
      return tg.sendTelegramMessage(chatId, '✅ تم ربط الجلسة. أرسل الإثبات الآن.');
    }

    if (String(token.chat_id) === String(chatId)) {
      return tg.sendTelegramMessage(chatId, '⏳ الجلسة مربوطة. أرسل الإثبات.');
    }

    return tg.sendTelegramMessage(chatId, '❌ هذا الرمز مستخدم من جهاز آخر.');
  }

  if (String(chatId) !== String(config.MISTRESS_CHAT_ID)) {
    return tg.sendTelegramMessage(chatId, '👋 مرحباً بك في مذبح الأرواح.\nابدأ من الموقع.');
  }
}

async function handleMediaUpload(message) {
  const chatId = message.chat.id;
  console.log('[MEDIA] from:', chatId);

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
  }

  // ✅ NEW: Get slave's caption (if any)
  const slaveCaption = message.caption || '';

  // ✅ NEW: Fetch task details from DB
  let taskDescAr = 'غير متوفر';
  let taskDescEn = 'N/A';
  let taskPunishment = 'غير متوفر';
  let taskReward = 'غير متوفر';
  let taskPoints = 0;
  
  try {
    const taskMatch = token.task_id.match(/lv(\d+)_/);
    if (taskMatch) {
      const levelNum = parseInt(taskMatch[1]);
      const tasks = await db.getTasksForLevel(levelNum);
      const task = tasks.find(t => t.task_id === token.task_id);
      if (task) {
        taskDescAr = task.description_ar || 'غير متوفر';
        taskDescEn = task.description_en || 'N/A';
        taskPunishment = task.punishment || 'غير متوفر';
        taskReward = task.reward || 'غير متوفر';
        taskPoints = task.points || 0;
      }
    }
  } catch (e) {
    console.log('[task fetch] failed:', e.message);
  }

  const reviewId = 'R' + Date.now();
  const now = new Date().toISOString();

  // ✅ NEW: Build rich caption
  const caption = 
    '🔍 <b>NEW PROOF SUBMISSION</b>\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '👤 <b>Slave ID:</b> <code>' + token.user_id + '</code>\n' +
    '📋 <b>Task ID:</b> <code>' + token.task_id + '</code>\n' +
    '💰 <b>Points:</b> ' + taskPoints + '\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '📝 <b>Task Description (AR):</b>\n' + taskDescAr + '\n\n' +
    '📝 <b>Task Description (EN):</b>\n' + taskDescEn + '\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '⚠️ <b>Original Punishment:</b>\n' + taskPunishment + '\n\n' +
    '🏆 <b>Reward:</b>\n' + taskReward + '\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    (slaveCaption ? '💬 <b>Slave\'s Note:</b>\n' + slaveCaption + '\n' + '━━━━━━━━━━━━━━━━━━━━\n' : '') +
    '🆔 <b>Review ID:</b> <code>' + reviewId + '</code>';

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
    await tg.sendTelegramMessage(chatId, '❌ فشل الإرسال: ' + fwdJson.description);
    return;
  }

  const channelMsgId = fwdJson.result.message_id;

  // Get file URL
  let directUrl = '';
  try {
    const fileJson = await tg.getFile(fileId);
    if (fileJson.ok) {
      directUrl = 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/' + fileJson.result.file_path;
    }
  } catch (e) { console.log('[getFile] failed:', e.message); }

  // Save to Supabase
  await db.createReview({
    review_id: reviewId,
    user_id: token.user_id,
    task_id: token.task_id,
    file_id: fileId,
    media_url: directUrl,
    slave_chat_id: String(chatId),
    status: 'pending',
    timestamp: now,
    channel_message_id: String(channelMsgId),
    slave_caption: slaveCaption  // ✅ عمود جديد
  });

  await db.updateToken(token.token, { used: true });

  // Confirm to slave
  await tg.sendTelegramMessage(chatId, '✅ <b>تم استلام الإثبات!</b>\nReview ID: ' + reviewId);

  // Notify Mistress
  if (String(chatId) !== String(config.MISTRESS_CHAT_ID)) {
    await tg.notifyMistress('📎 New Proof\nReview: ' + reviewId + '\nSlave: ' + token.user_id);
  }
}
