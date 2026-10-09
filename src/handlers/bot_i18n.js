// ═══════════════════════════════════════════════════════════════════════════════
// BOT I18N — ترجمات البوت
// ═══════════════════════════════════════════════════════════════════════════════
const BOT_I18N = {
  ar: {
    welcome: '👋 مرحباً بك في مذبح الأرواح.\n\nلإرسال إثبات، ابدأ من الموقع ثم عد إلى هنا.',
    welcome_mistress: '👑 مرحباً يا سيدتي. البوت جاهز لخدمتك.',
    invalid_token: '❌ رمز غير صالح. ابدأ من الموقع.',
    token_used: '❌ هذه الجلسة منتهية.',
    session_linked: '✅ تم ربط الجلسة. أرسل الإثبات الآن.',
    session_already_linked: '⏳ الجلسة مربوطة. أرسل الإثبات.',
    token_in_use: '❌ هذا الرمز مستخدم من جهاز آخر.',
    no_active_session: '❌ لا توجد جلسة نشطة. ابدأ من الموقع.',
    unsupported_file: '❌ نوع الملف غير مدعوم. أرسل صورة أو فيديو أو مستند.',
    upload_success: '✅ تم استلام الإثبات! جاري المراجعة.',
    upload_failed: '❌ فشل الإرسال. حاول مرة أخرى.',
    processing_error: '⚠️ حدث خطأ في المعالجة. حاول مرة أخرى.',
    choose_language: '🌐 اختر اللغة / Choose language:',
    language_set: '✅ تم تعيين اللغة: العربية',
    // caption labels
    caption_task: '📝 المهمة',
    caption_slave: '👤 الخاضع',
    caption_note: '💬 ملاحظة الخاضع',
  },
  en: {
    welcome: '👋 Welcome to The Altar of Souls.\n\nTo submit proof, start from the website then return here.',
    welcome_mistress: '👑 Welcome, Mistress. The bot is at your service.',
    invalid_token: '❌ Invalid token. Start from the website.',
    token_used: '❌ This session has ended.',
    session_linked: '✅ Session linked. Send your proof now.',
    session_already_linked: '⏳ Session linked. Send your proof.',
    token_in_use: '❌ This token is used from another device.',
    no_active_session: '❌ No active session. Start from the website.',
    unsupported_file: '❌ Unsupported file type. Send a photo, video, or document.',
    upload_success: '✅ Proof received! Under review.',
    upload_failed: '❌ Upload failed. Try again.',
    processing_error: '⚠️ Processing error. Try again.',
    choose_language: '🌐 Choose language:',
    language_set: '✅ Language set: English',
    // caption labels
    caption_task: '📝 Task',
    caption_slave: '👤 Slave',
    caption_note: '💬 Slave Note',
  }
};

function t_bot(lang, key) {
  return (BOT_I18N[lang] && BOT_I18N[lang][key]) || BOT_I18N['en'][key] || key;
}

module.exports = { t_bot, BOT_I18N };
