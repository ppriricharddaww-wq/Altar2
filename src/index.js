// ═══════════════════════════════════════════════════════════════════════════════
// THE ALTAR OF SOULS — Railway + Supabase Backend v3.0
// Express.js server with Telegram Webhook + JSONP API
// ═══════════════════════════════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');
const tg = require('./telegram');
const webhook = require('./handlers/webhook');
const auth = require('./handlers/auth');
const tasks = require('./handlers/tasks');
const reviews = require('./handlers/reviews');
const games = require('./handlers/games');
const { calculatePointsRequired, getStageName, generateUploadToken } = require('./utils');

const app = express();
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CORS CONFIGURATION (FIXED)
// ═══════════════════════════════════════════════════════════════════════════════
// استخدام دالة ديناميكية للتحقق من الأصل، مع إزالة الشرطة المائلة من كلا الطرفين
const allowedOrigins = [
  config.FRONTEND_URL ? config.FRONTEND_URL.replace(/\/$/, '') : '',
  'https://subhells.blogspot.com',
  'https://www.subhells.blogspot.com'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // السماح بالطلبات التي ليس لها أصل (مثل Postman)
    if (!origin) return callback(null, true);
    // إزالة الشرطة المائلة من الأصل القادم
    const cleanOrigin = origin.replace(/\/$/, '');
    // التحقق من القائمة المسموحة
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    // في بيئة التطوير، اسمح بكل شيء (اختياري)
    // return callback(null, true);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({ status: 'The Altar of Souls v3.0', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TELEGRAM WEBHOOK (POST)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api', async (req, res) => {
  try {
    await webhook.handleWebhook(req.body);
    res.send('OK');
  } catch (err) {
    console.error('[Webhook Error]', err);
    await db.logErrorDB('webhook', err.message);
    res.send('OK');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FRONTEND API (GET / JSONP)
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api', async (req, res) => {
  const { action, callback } = req.query;
  let result = { success: false, message: 'Unknown action' };

  try {
    switch (action) {
      case 'levelUp': result = await levelUpUser(req.query); break;
      case 'signup': result = await auth.signup(req.query); break;
      case 'login': result = await auth.login(req.query); break;
      case 'getLevel': result = await tasks.getLevel(req.query); break;
      case 'submitTask': result = await tasks.submitTask(req.query); break;
      case 'getPendingReviews': result = await reviews.getPendingReviews(req.query); break;
      case 'reviewTask': result = await reviews.reviewTask(req.query); break;
      case 'getUserStats': result = await getUserStats(req.query); break;
      case 'leaderboard': result = await getLeaderboard(); break;
      case 'levelJump': result = await levelJump(req.query); break;
      case 'completeAllTasks': result = await completeAllTasks(req.query); break;
      case 'updatePoints': result = await updatePoints(req.query); break;
      case 'playGame': result = await games.playGame(req.query); break;
      case 'verifyMaster': result = await auth.verifyMaster(req.query); break;
      case 'getUploadLink': result = await getUploadLink(req.query); break;
      case 'test': result = await runSelfTest(); break;
      default: result = { success: false, message: 'Unknown: ' + action };
    }
  } catch (err) {
    console.error('[API Error]', err);
    await db.logErrorDB('api_' + action, err.message);
    result = { success: false, message: err.message };
  }

  // إذا طلب JSONP (يوجد callback)، نُعيد JavaScript
  if (callback) {
    const js = `${callback}(${JSON.stringify(result)});`;
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    return res.send(js);
  }

  // وإلا نُعيد JSON عادي (لـ fetch)
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE UPLOAD (POST /api/upload)
// ═══════════════════════════════════════════════════════════════════════════════
// ملاحظة: هذا الجزء يفترض أنك تستخدم multer أو ما شابه لمعالجة FormData
// إذا لم يكن موجوداً في مشروعك، يمكنك حذفه والاعتماد على نقطة النهاية القديمة
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function getUserStats(params) {
  const userId = params.userId;
  if (!userId) return { success: false, message: 'User ID required' };

  const user = await db.findUserById(userId);
  if (!user) return { success: false, message: 'User not found' };

  const level = user.level || 1;
  const points = user.points || 0;
  const req = calculatePointsRequired(level);

  return {
    success: true,
    userId: user.id,
    nickname: user.nickname,
    level,
    points,
    pointsRequired: req,
    completedTasks: user.completed_tasks ? user.completed_tasks.split(',') : [],
    progress: Math.min(100, Math.round((points / req) * 100)),
    banned: user.banned_until && new Date(user.banned_until) > new Date(),
    bannedUntil: user.banned_until
  };
}

async function getLeaderboard() {
  const users = await db.getLeaderboard(20);
  return { success: true, leaderboard: users };
}

async function levelJump(params) {
  const master = auth.requireMaster(params);
  if (!master.authorized) return master;

  const { userId, targetLevel } = params;
  const target = parseInt(targetLevel);
  if (!userId || !target || target < 1 || target > 1000) {
    return { success: false, message: 'Invalid parameters' };
  }

  await db.updateUser(userId, {
    level: target,
    completed_tasks: '',
    points: calculatePointsRequired(target - 1),
    banned_until: null,
    ban_reason: null
  });

  return { success: true, message: 'Jumped to level ' + target };
}

async function completeAllTasks(params) {
  const master = auth.requireMaster(params);
  if (!master.authorized) return master;

  const { userId, level: levelStr } = params;
  const levelNum = parseInt(levelStr);
  if (!userId || !levelNum) return { success: false, message: 'Invalid parameters' };

  const user = await db.findUserById(userId);
  if (!user) return { success: false, message: 'User not found' };

  await tasks.getLevel({ level: levelNum }); // ensure tasks exist
  const levelTasks = await db.getTasksForLevel(levelNum);
  const taskIds = levelTasks.map(t => t.task_id);

  const existing = user.completed_tasks ? user.completed_tasks.split(',') : [];
  const allCompleted = [...new Set([...existing, ...taskIds])];
  const totalPoints = (user.points || 0) + levelTasks.reduce((sum, t) => sum + (t.points || 0), 0);

  await db.updateUser(userId, {
    completed_tasks: allCompleted.join(','),
    points: totalPoints
  });

  return { success: true, message: 'All tasks completed for level ' + levelNum };
}

async function updatePoints(params) {
  const master = auth.requireMaster(params);
  if (!master.authorized) return master;

  const { userId, points } = params;
  if (!userId || isNaN(parseInt(points))) {
    return { success: false, message: 'Invalid parameters' };
  }

  await db.updateUser(userId, { points: Math.max(0, parseInt(points)) });
  return { success: true, message: 'Points updated to ' + points };
}

async function getUploadLink(params) {
  const { userId, taskId } = params;
  if (!userId || !taskId) return { success: false, message: 'Missing parameters' };

  const token = generateUploadToken();
  await db.createUploadToken({
    token,
    user_id: userId,
    task_id: taskId,
    chat_id: '',
    created_at: new Date().toISOString(),
    used: false
  });

  const botInfo = await tg.getBotInfo();
  const botUsername = botInfo.ok ? botInfo.result.username : 'YourBot';

  return {
    success: true,
    token,
    deepLink: 'https://t.me/' + botUsername + '?start=UPLOAD_' + token
  };
}
async function levelUpUser(params) {
  const { userId, masterPassword } = params;
  
  if (!userId) return { success: false, message: 'Missing userId' };

  const user = await db.findUserById(userId);
  if (!user) return { success: false, message: 'User not found' };

  const currentLevel = user.level || 1;
  if (currentLevel >= 1000) {
    return { success: false, message: 'Max level reached' };
  }

  const pointsRequired = Math.floor(10 + (currentLevel * 1.5));
  const currentPoints = user.points || 0;

  if (currentPoints < pointsRequired) {
    return { success: false, message: 'Not enough points', pointsRequired, currentPoints };
  }

  const newLevel = currentLevel + 1;
  const newPoints = currentPoints;  
  await db.updateUser(userId, {
    level: newLevel,
    points: newPoints,
    completed_tasks: ''  // ✅ إعادة تعيين المهام للمستوى الجديد
  });

  return {
    success: true,
    message: 'Leveled up to ' + newLevel,
    newLevel: newLevel,
    newPoints: newPoints,
    pointsRequired: Math.floor(10 + (newLevel * 1.5))
  };
}
async function runSelfTest() {
  const results = {
    timestamp: new Date().toISOString(),
    telegramBot: false,
    channel: false,
    supabase: false
  };

  try {
    const botInfo = await tg.getBotInfo();
    results.telegramBot = botInfo.ok;
    if (botInfo.ok) results.botName = botInfo.result.username;
  } catch (e) { results.telegramBotError = e.message; }

  try {
    const chRes = await fetch(config.TG_API + '/getChat?chat_id=' + config.CHANNEL_ID);
    const chJson = await chRes.json();
    results.channel = chJson.ok;
  } catch (e) { results.channelError = e.message; }

  try {
    const users = await db.getLeaderboard(1);
    results.supabase = Array.isArray(users);
  } catch (e) { results.supabaseError = e.message; }

  return {
    success: results.telegramBot && results.channel && results.supabase,
    results,
    message: 'Railway + Supabase backend v3.0 active.'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || config.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🔥 The Altar of Souls v3.0 running on port ' + PORT);
  console.log('📡 Webhook URL: ' + config.FRONTEND_URL);
  console.log('🌐 Allowed origins:', allowedOrigins.join(', '));
});
