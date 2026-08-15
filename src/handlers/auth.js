// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
const db = require('../db');
const tg = require('../telegram');
const { generatePassword } = require('../utils');

async function signup(params) {
  const nickname = (params.nickname || '').trim();
  if (!nickname || nickname.length < 2 || nickname.length > 30) {
    return { success: false, message: 'Nickname must be 2-30 characters' };
  }

  const userId = 'USR' + Date.now() + Math.floor(Math.random() * 1000);
  const password = generatePassword(12);
  const now = new Date().toISOString();

  await db.createUser({
    id: userId,
    password,
    nickname,
    level: 1,
    completed_tasks: '',
    points: 0,
    created_at: now
  });

  await tg.notifyMistress('🔔 New Slave Registered\n\nID: ' + userId + '\nNickname: ' + nickname + '\nLevel: 1');

  return { success: true, userId, password, nickname, level: 1, points: 0 };
}

async function login(params) {
  const userId = (params.userId || '').trim();
  const password = (params.password || '').trim();

  if (!userId || !password) {
    return { success: false, message: 'User ID and password required' };
  }

  const user = await db.findUserByCredentials(userId, password);
  if (!user) {
    return { success: false, message: 'Invalid credentials' };
  }

  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return { success: false, message: 'Account banned until ' + user.banned_until, banned: true, bannedUntil: user.banned_until };
  }

  return {
    success: true,
    userId: user.id,
    nickname: user.nickname,
    level: user.level || 1,
    completedTasks: user.completed_tasks ? user.completed_tasks.split(',') : [],
    points: user.points || 0
  };
}

async function verifyMaster(params) {
  const config = require('../config');
  const pwd = (params.masterPassword || '').trim();
  if (pwd === config.MASTER_PASSWORD) {
    return { success: true, message: 'Master authenticated' };
  }
  return { success: false, message: 'Invalid master password' };
}

function requireMaster(params) {
  const config = require('../config');
  const pwd = (params.masterPassword || '').trim();
  if (pwd !== config.MASTER_PASSWORD) {
    return { authorized: false, message: 'Master authentication required' };
  }
  return { authorized: true };
}

module.exports = { signup, login, verifyMaster, requireMaster };
