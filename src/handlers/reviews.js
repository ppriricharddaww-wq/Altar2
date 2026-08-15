// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW SYSTEM — Master Panel + Inline Keyboard
// ═══════════════════════════════════════════════════════════════════════════════
const config = require('../config');
const db = require('../db');
const tg = require('../telegram');

async function getPendingReviews(params) {
  const auth = require('./auth').requireMaster(params);
  if (!auth.authorized) return auth;

  const reviews = await db.getPendingReviews();
  return { success: true, reviews };
}

async function reviewTask(params) {
  const auth = require('./auth').requireMaster(params);
  if (!auth.authorized) return auth;

  return processReview(params.reviewId, params.reviewAction, params.reviewerId || 'Mistress');
}

async function processReview(reviewId, action, reviewerId) {
  const review = await db.findReviewById(reviewId);
  if (!review || review.status !== 'pending') {
    return { success: false, message: 'Review not found or already processed' };
  }

  const userId = review.user_id;
  const taskId = review.task_id;
  const slaveChatId = review.slave_chat_id;
  const channelMsgId = review.channel_message_id;
  const now = new Date().toISOString();

  await db.updateReview(reviewId, {
    status: action === 'accept' ? 'approved' : 'rejected',
    reviewed_at: now,
    reviewed_by: reviewerId
  });

  const user = await db.findUserById(userId);
  if (!user) return { success: false, message: 'User not found' };

  const taskMatch = taskId.match(/lv(\d+)_/);
  const levelNum = taskMatch ? parseInt(taskMatch[1]) : 1;
  const tasks = await db.getTasksForLevel(levelNum);
  const task = tasks.find(t => t.task_id === taskId);
  const taskPoints = task ? task.points : 10;

  if (action === 'accept') {
    const currentPoints = user.points || 0;
    const newPoints = currentPoints + taskPoints;
    const completedStr = user.completed_tasks || '';
    const newCompleted = completedStr ? completedStr + ',' + taskId : taskId;

    await db.updateUser(userId, { completed_tasks: newCompleted, points: newPoints });

    const pointsRequired = Math.floor(10 + (levelNum * 1.5));
    let leveledUp = false;
    let newLevel = levelNum;

    if (newPoints >= pointsRequired && levelNum < 1000) {
      newLevel = levelNum + 1;
      await db.updateUser(userId, { level: newLevel });
      leveledUp = true;
    }

    // Edit channel message
    if (channelMsgId) {
      await tg.editMessageCaption(config.CHANNEL_ID, parseInt(channelMsgId),
        '✅ <b>APPROVED</b>\n\n👤 Slave: ' + userId + '\n📋 Task: ' + taskId + '\n➕ Points: +' + taskPoints);
    }

    // Notify slave
    if (slaveChatId) {
      await tg.sendTelegramMessage(slaveChatId,
        '✅ <b>تم قبول إثباتك!</b>\n\nReview: ' + reviewId + '\nTask: ' + taskId + '\nPoints: +' + taskPoints +
        (leveledUp ? '\n⬆️ Level Up! New Level: ' + newLevel : ''));
    }

    await tg.notifyMistress('✅ Proof Accepted\n\nSlave: ' + userId + '\nTask: ' + taskId + '\nPoints: +' + taskPoints);

    return { success: true, message: 'Task approved', pointsEarned: taskPoints, totalPoints: newPoints, leveledUp, newLevel };

  } else {
    // REJECT
    const currentPoints = user.points || 0;
    const penalty = taskPoints * 2;
    const newPoints = Math.max(0, currentPoints - penalty);

    await db.updateUser(userId, { points: newPoints });

    // Halve task points
    if (task) {
      await db.updateTaskPoints(taskId, Math.max(1, Math.floor(taskPoints / 2)));
    }

    let banned = false;
    let bannedUntil = null;

    if (levelNum >= 91) {
      bannedUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      await db.updateUser(userId, { banned_until: bannedUntil, ban_reason: 'Extreme punishment: proof rejected at level ' + levelNum });
      banned = true;
    }

    // Edit channel message
    if (channelMsgId) {
      await tg.editMessageCaption(config.CHANNEL_ID, parseInt(channelMsgId),
        '❌ <b>REJECTED</b>\n\n👤 Slave: ' + userId + '\n📋 Task: ' + taskId + '\n➖ Penalty: -' + penalty + ' points');
    }

    // Notify slave
    if (slaveChatId) {
      await tg.sendTelegramMessage(slaveChatId,
        '❌ <b>تم رفض إثباتك</b>\n\nReview: ' + reviewId + '\nTask: ' + taskId + '\nPenalty: -' + penalty + ' points' +
        (banned ? '\n🚫 Banned until: ' + bannedUntil : ''));
    }

    await tg.notifyMistress('❌ Proof Rejected\n\nSlave: ' + userId + '\nTask: ' + taskId + '\nPenalty: -' + penalty + (banned ? '\nBANNED 6 hours' : ''));

    return { success: true, message: 'Task rejected. Penalty: -' + penalty, penalty, totalPoints: newPoints, banned, bannedUntil };
  }
}

module.exports = { getPendingReviews, reviewTask, processReview };
