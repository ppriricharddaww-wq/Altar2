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

    return; // ✅ انتهى: استخدمنا المهام المخصصة
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. إذا لم توجد مهام مخصصة، استخدم التوليد التلقائي (الكود الأصلي)
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
