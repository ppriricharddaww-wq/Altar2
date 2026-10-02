// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT — V3.0
// ═══════════════════════════════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// TASKS (المهام المولّدة)
// ═══════════════════════════════════════════════════════════════════════════════
async function getTasksForLevel(levelNum) {
  // ✅ الجدول الصحيح هو 'tasks' وليس 'levels'
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('level_number', levelNum)
    .order('task_id', { ascending: true });
  
  if (error) {
    console.error('[getTasksForLevel] Error:', error.message);
    return [];
  }
  return data || [];
}

async function createLevelTask(taskData) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error('[createLevelTask] Error:', error.message);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('[createLevelTask] Exception:', err.message);
    throw err;
  }
}

async function updateTaskPoints(taskId, newPoints) {
  // ✅ الجدول الصحيح هو 'tasks'
  const { error } = await supabase
    .from('tasks')
    .update({ points: newPoints })
    .eq('task_id', taskId);
  return !error;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TASKS (المهام المخصصة)
// ═══════════════════════════════════════════════════════════════════════════════
async function getCustomTasksForLevel(levelNum) {
  try {
    const { data, error } = await supabase
      .from('custom_tasks')
      .select('*')
      .eq('level_number', levelNum)
      .eq('active', true)
      .order('task_index', { ascending: true });

    if (error) {
      console.error('[getCustomTasksForLevel] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getCustomTasksForLevel] Exception:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS (المراجعات)
// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ تحقق من اسم الجدول: 'reviews' أم 'pending_reviews'؟
// الكود يستخدم 'reviews' هنا، إن كان جدولك اسمه مختلفاً غيّره
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
  const { data, error } = await supabase
    .from('pending_reviews')
    .update(updates)
    .eq('review_id', reviewId)
    .select()
    .single();
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

// ✅ جديد: جلب المراجعات المعلقة لمستخدم معين (لحل المشكلة الثالثة)
async function getPendingReviewsByUser(userId) {
  try {
    const { data, error } = await supabase
      .from('pending_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('[getPendingReviewsByUser] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getPendingReviewsByUser] Exception:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD TOKENS
// ═══════════════════════════════════════════════════════════════════════════════
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
  const { error } = await supabase
    .from('upload_tokens')
    .update(updates)
    .eq('token', tokenStr);
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

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR LOGS
// ═══════════════════════════════════════════════════════════════════════════════
async function logErrorDB(funcName, message) {
  await supabase.from('error_logs').insert([{
    timestamp: new Date().toISOString(),
    function_name: funcName,
    message: String(message)
  }]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function getLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('users')
    .select('id, nickname, level, points')
    .order('level', { ascending: false })
    .order('points', { ascending: false })
    .limit(limit);
  return error ? [] : data;
}
async function getPendingReviewsByUser(userId) {
  try {
    const { data, error } = await supabase
      .from('s')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('[getPendingReviewsByUser] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getPendingReviewsByUser] Exception:', err.message);
    return [];
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS (⚠️ مرة واحدة فقط، في نهاية الملف)
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  supabase,
  // Users
  findUserById,
  findUserByCredentials,
  createUser,
  updateUser,
  // Tasks
  getTasksForLevel,
  createLevelTask,
  updateTaskPoints,
  // Custom Tasks
  getCustomTasksForLevel,
  // Reviews
  createReview,
  findReviewById,
  updateReview,
  getPendingReviews,
  getPendingReviewsByUser,
  // Upload Tokens
  createUploadToken,
  findToken,
  updateToken,
  findActiveTokenByChatId,
  // Logs
  logErrorDB,
  getPendingReviewsByUser,
  // Leaderboard
  getLeaderboard
};
