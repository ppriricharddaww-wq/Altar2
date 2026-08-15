// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT — أسرع وأقوى من Google Sheets
// ═══════════════════════════════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// ─── USERS ───────────────────────────────────────────────────────────────────
async function findUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return error ? null : data;
}

async function findUserByCredentials(userId, password) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('password', password)
    .single();
  return error ? null : data;
}

async function createUser(user) {
  const { data, error } = await supabase.from('users').insert([user]).select().single();
  return error ? null : data;
}

async function updateUser(userId, updates) {
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();
  return error ? null : data;
}

// ─── LEVELS ──────────────────────────────────────────────────────────────────
async function getTasksForLevel(levelNum) {
  const { data, error } = await supabase
    .from('levels')
    .select('*')
    .eq('level_number', levelNum);
  return error ? [] : data;
}

async function createLevelTask(task) {
  const { error } = await supabase.from('levels').insert([task]);
  return !error;
}

async function updateTaskPoints(taskId, newPoints) {
  const { error } = await supabase.from('levels').update({ points: newPoints }).eq('task_id', taskId);
  return !error;
}

// ─── PENDING REVIEWS ─────────────────────────────────────────────────────────
async function createReview(review) {
  const { data, error } = await supabase.from('pending_reviews').insert([review]).select().single();
  return error ? null : data;
}

async function findReviewById(reviewId) {
  const { data, error } = await supabase
    .from('pending_reviews')
    .select('*')
    .eq('review_id', reviewId)
    .single();
  return error ? null : data;
}

async function updateReview(reviewId, updates) {
  const { data, error } = await supabase.from('pending_reviews').update(updates).eq('review_id', reviewId).select().single();
  return error ? null : data;
}

async function getPendingReviews() {
  const { data, error } = await supabase
    .from('pending_reviews')
    .select('*')
    .eq('status', 'pending')
    .order('timestamp', { ascending: false });
  return error ? [] : data;
}

// ─── UPLOAD TOKENS ───────────────────────────────────────────────────────────
async function createUploadToken(token) {
  const { error } = await supabase.from('upload_tokens').insert([token]);
  return !error;
}

async function findToken(tokenStr) {
  const { data, error } = await supabase
    .from('upload_tokens')
    .select('*')
    .eq('token', tokenStr)
    .single();
  return error ? null : data;
}

async function updateToken(tokenStr, updates) {
  const { error } = await supabase.from('upload_tokens').update(updates).eq('token', tokenStr);
  return !error;
}

async function findActiveTokenByChatId(chatId) {
  const { data, error } = await supabase
    .from('upload_tokens')
    .select('*')
    .eq('chat_id', String(chatId))
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return error ? null : data;
}

// ─── ERROR LOGS ──────────────────────────────────────────────────────────────
async function logErrorDB(funcName, message) {
  await supabase.from('error_logs').insert([{
    timestamp: new Date().toISOString(),
    function_name: funcName,
    message: String(message)
  }]);
}

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
async function getLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('users')
    .select('id, nickname, level, points')
    .order('level', { ascending: false })
    .order('points', { ascending: false })
    .limit(limit);
  return error ? [] : data;
}

module.exports = {
  supabase,
  findUserById,
  findUserByCredentials,
  createUser,
  updateUser,
  getTasksForLevel,
  createLevelTask,
  updateTaskPoints,
  createReview,
  findReviewById,
  updateReview,
  getPendingReviews,
  createUploadToken,
  findToken,
  updateToken,
  findActiveTokenByChatId,
  logErrorDB,
  getLeaderboard
};
