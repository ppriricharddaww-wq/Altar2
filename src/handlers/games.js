// ═══════════════════════════════════════════════════════════════════════════════
// GAMES HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
const db = require('../db');

async function playGame(params) {
  const { userId, gameType, outcome } = params;

  if (!userId || !gameType || !outcome) {
    return { success: false, message: 'Missing parameters' };
  }

  const user = await db.findUserById(userId);
  if (!user) return { success: false, message: 'User not found' };

  let currentPoints = user.points || 0;
  let pointsChange = 0;

  if (outcome === 'win') {
    pointsChange = gameType === 'rps' ? 15 : 10;
    currentPoints += pointsChange;
  } else if (outcome === 'loss') {
    pointsChange = -5;
    currentPoints = Math.max(0, currentPoints + pointsChange);
  }

  await db.updateUser(userId, { points: currentPoints });

  return { success: true, pointsChange, totalPoints: currentPoints };
}

module.exports = { playGame };
