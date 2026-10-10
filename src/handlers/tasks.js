// ═══════════════════════════════════════════════════════════════════════════════
// TASKS & LEVELS HANDLERS (مع دعم المهام المخصصة)
// ═══════════════════════════════════════════════════════════════════════════════
const db = require('../db');
const { calculatePointsRequired, getStageName, SeededRandom } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Convert DB task (snake_case) to Frontend task (camelCase)
// ═══════════════════════════════════════════════════════════════════════════════
function mapTaskForFrontend(t) {
  return {
    taskID: t.task_id,
    level: t.level_number,
    points: t.points,
    descriptionAR: t.description_ar,
    descriptionEN: t.description_en,
    verificationType: t.verification_type,
    verificationAnswer: t.verification_answer,
    punishment: t.punishment,
    punishmentType: t.punishment_type,   // ✅ جديد
    punishmentValue: t.punishment_value,  // ✅ جديد
    reward: t.reward,
    mediaRequired: t.media_required
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET LEVEL
// ═══════════════════════════════════════════════════════════════════════════════
async function getLevel(params) {
  const levelNum = parseInt(params.level) || 1;
  const userId = params.userId || '';

  if (levelNum < 1 || levelNum > 1000) {
    return { success: false, message: 'Invalid level' };
  }

  await ensureLevelTasks(levelNum);

  const rawTasks = await db.getTasksForLevel(levelNum);
  const tasks = rawTasks.map(mapTaskForFrontend);
  const pointsRequired = calculatePointsRequired(levelNum);

  let completedTasks = [];
  let pendingTasks = [];
  let rejectedTasks = [];

  if (userId) {
    const user = await db.findUserById(userId);
    if (user && user.completed_tasks) {
      completedTasks = user.completed_tasks
        .split(',')
        .filter(t => t.startsWith('lv' + levelNum + '_'));
    }

    // المهام قيد المراجعة
    const pending = await db.getPendingReviewsByUser(userId);
    if (pending) {
      pendingTasks = pending
        .filter(r => r.task_id && r.task_id.startsWith('lv' + levelNum + '_'))
        .map(r => r.task_id);
    }

    // ✅ المهام المرفوضة
    const rejected = await db.getRejectedReviewsByUser(userId);
    if (rejected) {
      const latestRejections = {};
      const latestPending = {};

      pending.forEach(r => {
        if (r.task_id && !latestPending[r.task_id]) {
          latestPending[r.task_id] = r.reviewed_at || r.timestamp;
        }
      });

      rejected.forEach(r => {
        if (r.task_id && r.task_id.startsWith('lv' + levelNum + '_')) {
          if (!latestRejections[r.task_id]) {
            latestRejections[r.task_id] = r;
          }
        }
      });

      rejectedTasks = Object.keys(latestRejections).filter(taskId => {
        const rejectTime = new Date(latestRejections[taskId].reviewed_at || latestRejections[taskId].timestamp).getTime();
        const pendingTime = latestPending[taskId] ? new Date(latestPending[taskId]).getTime() : 0;
        return rejectTime > pendingTime;
      });
    }
  }

  return {
    success: true,
    level: levelNum,
    tasks,
    pointsRequired,
    completedTasks,
    pendingTasks,
    rejectedTasks,
    stage: Math.ceil(levelNum / 10),
    stageName: getStageName(Math.ceil(levelNum / 10))
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT TASK
// ═══════════════════════════════════════════════════════════════════════════════
async function submitTask(params) {
  const { userId, taskId, answer, level: levelStr } = params;
  const levelNum = parseInt(levelStr) || 1;

  if (!userId || !taskId) {
    return { success: false, message: 'Missing parameters' };
  }

  const user = await db.findUserById(userId);
  if (!user) return { success: false, message: 'User not found' };

  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return { success: false, message: 'Account banned until ' + user.banned_until, banned: true };
  }

  await ensureLevelTasks(levelNum);
  const rawTasks = await db.getTasksForLevel(levelNum);
  const task = rawTasks.find(t => t.task_id === taskId);
  if (!task) return { success: false, message: 'Task not found' };

  const completed = user.completed_tasks ? user.completed_tasks.split(',') : [];
  if (completed.includes(taskId)) {
    return { success: false, message: 'Task already completed' };
  }

  if (task.verification_type === 'media') {
    return { success: false, message: 'Proof upload required for this task', requiresMedia: true };
  }

  if (task.verification_answer && task.verification_type !== 'game' && task.verification_type !== 'choice') {
    if ((answer || '').trim().toLowerCase() !== String(task.verification_answer).toLowerCase()) {
      return { success: false, message: 'Incorrect answer', correct: false };
    }
  }

  const newCompleted = completed.length > 0 ? user.completed_tasks + ',' + taskId : taskId;
  const newPoints = (user.points || 0) + (task.points || 10);

  await db.updateUser(userId, {
    completed_tasks: newCompleted,
    points: newPoints
  });

  const pointsRequired = calculatePointsRequired(levelNum);
  const canLevelUp = newPoints >= pointsRequired && levelNum < 1000;

  return {
    success: true,
    message: 'Task completed',
    pointsEarned: task.points,
    totalPoints: newPoints,
    canLevelUp: canLevelUp,
    pointsRequired: pointsRequired,
    currentLevel: levelNum
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENSURE LEVEL TASKS (المهام المخصصة فقط + fallback)
// ═══════════════════════════════════════════════════════════════════════════════
async function ensureLevelTasks(levelNum) {
  // 1. تحقق من وجود مهام مسبقة
  const existing = await db.getTasksForLevel(levelNum);
  if (existing.length > 0) return;

  // 2. جلب المهام المخصصة
  const customTasks = await db.getCustomTasksForLevel(levelNum);

  if (customTasks.length > 0) {
    console.log('[ensureLevelTasks] Using ' + customTasks.length + ' custom tasks for level ' + levelNum);
    for (const ct of customTasks) {
      await db.createLevelTask({
        task_id: 'lv' + levelNum + '_task' + ct.task_index,
        level_number: levelNum,
        points: ct.points,
        description_ar: ct.description_ar,
        description_en: ct.description_en,
        verification_type: ct.verification_type,
        verification_answer: ct.verification_answer || '',
        // ✅ العقوبة المخصصة
        punishment: ct.punishment_text || 'خصم ضعف النقاط',
        punishment_type: ct.punishment_type || 'points',
        punishment_value: ct.punishment_value || 0,
        // ✅ المكافأة المخصصة (اختياري)
        reward: ct.reward_text || '',
        media_required: ct.media_required || false
      });
    }
    return;
  }

  console.log('[ensureLevelTasks] No custom tasks for level ' + levelNum + ' — level is empty');
  return;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = { getLevel, submitTask };
