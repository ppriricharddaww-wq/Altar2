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
  if (userId) {
    const user = await db.findUserById(userId);
    if (user && user.completed_tasks) {
      completedTasks = user.completed_tasks
        .split(',')
        .filter(t => t.startsWith('lv' + levelNum + '_'));
    }
  }

  return {
    success: true,
    level: levelNum,
    tasks,
    pointsRequired,
    completedTasks,
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
  let leveledUp = false;
  let newLevel = levelNum;

  if (newPoints >= pointsRequired && levelNum < 1000) {
    newLevel = levelNum + 1;
    await db.updateUser(userId, { level: newLevel });
    leveledUp = true;
  }

  return {
    success: true,
    message: 'Task completed',
    pointsEarned: task.points,
    totalPoints: newPoints,
    leveledUp,
    newLevel,
    pointsRequired: leveledUp ? calculatePointsRequired(newLevel) : pointsRequired
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENSURE LEVEL TASKS (مع دعم المهام المخصصة)
// ═══════════════════════════════════════════════════════════════════════════════
async function ensureLevelTasks(levelNum) {
  // 1. التحقق من وجود مهام مسبقة لهذا المستوى
  const existing = await db.getTasksForLevel(levelNum);
  if (existing.length > 0) return;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. محاولة جلب المهام المخصصة من جدول custom_tasks
  // ═══════════════════════════════════════════════════════════════════════════
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
        punishment: ct.punishment || 'Extra task',
        reward: ct.reward || 'Bonus points',
        media_required: ct.media_required || false
      });
    }

    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. التوليد التلقائي
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[ensureLevelTasks] Auto-generating tasks for level ' + levelNum);

  const numTasks = Math.min(3 + Math.floor(levelNum / 20), 12);
  const phrases = [
    'I am a talking corpse', 'I exist to serve', 'My will is not my own',
    'I am nothing without my Mistress', 'I surrender completely', 'I am clay in your hands',
    'My body belongs to you', 'I am an empty vessel', 'I obey without question'
  ];
  const words = ['Submission', 'Surrender', 'Obedience', 'Devotion', 'Servitude', 'Loyalty', 'Discipline'];
  const actions = [
    'kneeling', 'bowing down', 'holding a sign', 'in position', 'following orders',
    'showing gratitude', 'in submission pose', 'blindfolded', 'bound'
  ];
  const options1 = ['10 lashes', '1 hour kneeling', 'Write 100 lines', 'No speaking for 2 hours'];
  const options2 = ['5 lashes + humiliation', '2 hours in corner', 'Apologize on video', 'Wear a collar all day'];

  for (let i = 0; i < numTasks; i++) {
    const seed = levelNum * 10000 + i * 777;
    const rng = new SeededRandom(seed);
    const taskType = rng.nextInt(0, 5);
    const points = Math.floor(5 + (levelNum / 10) + (i * 1.5));

    let descAr = '', descEn = '', answer = '', vType = '', mediaReq = false;

    switch (taskType) {
      case 0:
        const phrase = phrases[rng.nextInt(0, phrases.length - 1)];
        descAr = 'اكتب العبارة التالية: "' + phrase + '"';
        descEn = 'Type the following phrase: "' + phrase + '"';
        answer = phrase; vType = 'text';
        break;
      case 1:
        const a = rng.nextInt(1, 20), b = rng.nextInt(1, 10), c = rng.nextInt(1, 5);
        descAr = 'احسب: ' + a + ' + ' + b + ' × ' + c;
        descEn = 'Calculate: ' + a + ' + ' + b + ' × ' + c;
        answer = String(a + b * c); vType = 'number';
        break;
      case 2:
        const word = words[rng.nextInt(0, words.length - 1)];
        descAr = 'اكتب كلمة: ' + word;
        descEn = 'Type the word: ' + word;
        answer = word; vType = 'word';
        break;
      case 3:
        const action = actions[rng.nextInt(0, actions.length - 1)];
        descAr = 'قم بتصوير نفسك وأنت ' + action + ' ثم ارسل الصورة';
        descEn = 'Take a photo of yourself ' + action + ' and upload it';
        vType = 'media'; mediaReq = true;
        break;
      case 4:
        descAr = 'العب لعبة الأبواب الثلاثة';
        descEn = 'Play the Three Doors game';
        vType = 'game';
        break;
      case 5:
        const opt1 = options1[rng.nextInt(0, options1.length - 1)];
        const opt2 = options2[rng.nextInt(0, options2.length - 1)];
        descAr = 'اختر: ' + opt1 + ' أم ' + opt2;
        descEn = 'Choose: ' + opt1 + ' or ' + opt2;
        vType = 'choice';
        break;
    }

    const punishments = ['Extra task', '5-minute timeout', 'Write apology', 'Stand in corner'];
    const rewards = ['Bonus shadow points', 'Exclusive title', '50% reduction on next punishment', 'Secret room access'];

    await db.createLevelTask({
      task_id: 'lv' + levelNum + '_task' + i,
      level_number: levelNum,
      points,
      description_ar: descAr,
      description_en: descEn,
      verification_type: vType,
      verification_answer: answer,
      punishment: punishments[rng.nextInt(0, punishments.length - 1)],
      reward: rewards[rng.nextInt(0, rewards.length - 1)],
      media_required: mediaReq
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS (⚠️ هذا السطر ضروري جداً)
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = { getLevel, submitTask };
