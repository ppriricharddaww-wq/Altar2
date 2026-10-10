// ═══════════════════════════════════════════════════════════════════════════════
// BOT I18N — ترجمات البوت
// ═══════════════════════════════════════════════════════════════════════════════
const BOT_I18N = {
  ar: {
    // رسائل الترحيب
    welcome: '🔥 <b>مرحباً بك في مذبح الأرواح</b>\n━━━━━━━━━━━━━━━━━━━━\nهذا البوت مخصص لاستقبال إثباتات تنفيذ المهام.\nلإرسال إثبات، ابدأ من الموقع ثم عد إلى هنا.',
    welcome_returning: '🔥 <b>مرحباً بك مجدداً في مذبح الأرواح</b>\n\nلإرسال إثبات، ابدأ من الموقع ثم عد إلى هنا.',
    welcome_mistress: '👑 <b>مرحباً يا سيدتي</b>\n\nالبوت جاهز لخدمتك.\n\nاستخدم /start لعرض الإعدادات.',
    
    // رسائل الجلسة
    invalid_token: '❌ رمز غير صالح. ابدأ من الموقع.',
    token_used: '❌ هذه الجلسة منتهية.',
    session_linked: '✅ تم ربط الجلسة. أرسل الإثبات الآن.',
    session_already_linked: '⏳ الجلسة مربوطة. أرسل الإثبات.',
    token_in_use: '❌ هذا الرمز مستخدم من جهاز آخر.',
    no_active_session: '❌ لا توجد جلسة نشطة. ابدأ من الموقع.',
    
    // رسائل الملفات
    unsupported_file: '❌ نوع الملف غير مدعوم. أرسل صورة أو فيديو أو مستند.',
    upload_success: '✅ تم استلام الإثبات! جاري المراجعة.',
    upload_failed: '❌ فشل الإرسال. حاول مرة أخرى.',
    processing_error: '⚠️ حدث خطأ في المعالجة. حاول مرة أخرى.',
    
    // رسائل اللغة
    choose_language: '🌐 اختر اللغة:',
    language_set: '✅ تم تعيين اللغة: العربية',
    
    // caption labels
    caption_task: '📝 المهمة',
    caption_slave: '👤 الخاضع',
    caption_note: '💬 ملاحظة الخاضع',
    
    // ✅ رسائل القبول والرفض
    proof_accepted: '✅ <b>تم قبول إثباتك!</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n➕ النقاط المكتسبة: +{points}',
    proof_accepted_levelup: '✅ <b>تم قبول إثباتك!</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n➕ النقاط المكتسبة: +{points}\n⬆️ ترقية! المستوى الجديد: {newLevel}',
    proof_rejected: '❌ <b>تم رفض إثباتك</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n➖ العقوبة: -{penalty} نقطة',
    proof_rejected_banned: '❌ <b>تم رفض إثباتك</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n➖ العقوبة: -{penalty} نقطة\n🚫 حظر حتى: {bannedUntil}',
    proof_rejected_no_penalty: '❌ <b>تم رفض إثباتك</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n\nيمكنك إعادة المحاولة بإثبات جديد.',
  },
  en: {
    // Welcome messages
    welcome: '🔥 <b>Welcome to The Altar of Souls</b>\n━━━━━━━━━━━━━━━━━━━━\nThis bot is for submitting task proofs.\nTo submit proof, start from the website then return here.',
    welcome_returning: '🔥 <b>Welcome back to The Altar of Souls</b>\n\nTo submit proof, start from the website then return here.',
    welcome_mistress: '👑 <b>Welcome, Mistress</b>\n\nThe bot is at your service.\n\nUse /start to view settings.',
    
    // Session messages
    invalid_token: '❌ Invalid token. Start from the website.',
    token_used: '❌ This session has ended.',
    session_linked: '✅ Session linked. Send your proof now.',
    session_already_linked: '⏳ Session linked. Send your proof.',
    token_in_use: '❌ This token is used from another device.',
    no_active_session: '❌ No active session. Start from the website.',
    
    // File messages
    unsupported_file: '❌ Unsupported file type. Send a photo, video, or document.',
    upload_success: '✅ Proof received! Under review.',
    upload_failed: '❌ Upload failed. Try again.',
    processing_error: '⚠️ Processing error. Try again.',
    
    // Language messages
    choose_language: '🌐 Choose language:',
    language_set: '✅ Language set: English',
    
    // caption labels
    caption_task: '📝 Task',
    caption_slave: '👤 Slave',
    caption_note: '💬 Slave Note',
    
    // ✅ Acceptance/Rejection messages
    proof_accepted: '✅ <b>Your proof has been accepted!</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n➕ Points earned: +{points}',
    proof_accepted_levelup: '✅ <b>Your proof has been accepted!</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n➕ Points earned: +{points}\n⬆️ Level up! New level: {newLevel}',
    proof_rejected: '❌ <b>Your proof has been rejected</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n➖ Penalty: -{penalty} points',
    proof_rejected_banned: '❌ <b>Your proof has been rejected</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n➖ Penalty: -{penalty} points\n🚫 Banned until: {bannedUntil}',
    proof_rejected_no_penalty: '❌ <b>Your proof has been rejected</b>\n\n🆔 Review: {reviewId}\n📋 Task: {taskId}\n\nYou can try again with a new proof.',
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// دوال الترجمة
// ═══════════════════════════════════════════════════════════════════════════════
function t_bot(lang, key) {
  return (BOT_I18N[lang] && BOT_I18N[lang][key]) || BOT_I18N['en'][key] || key;
}

// ✅ دالة استبدال المتغيرات في الرسائل
function t_bot_replace(lang, key, replacements) {
  let text = t_bot(lang, key);
  if (replacements) {
    for (const k in replacements) {
      text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), replacements[k]);
    }
  }
  return text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS (⚠️ مرة واحدة فقط)
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = { t_bot, t_bot_replace, BOT_I18N };
