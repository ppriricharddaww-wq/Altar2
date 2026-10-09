// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function generateUploadToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function calculatePointsRequiredFromDB(levelNum) {
  try {
    const { data, error } = await db.supabase
      .from('level_config')
      .select('points_required')
      .eq('level_number', levelNum)
      .single();
    if (!error && data) return data.points_required;
  } catch (e) {}
  // fallback
  return Math.floor(10 + (levelNum * 1.5));
}

function getStageName(stage) {
  const names = [
    'The Awakening', 'The First Obeisance', 'The Trial of Flesh', 'The Mind Cage',
    'The Blood Oath', 'The Iron Collar', 'The Shadow Path', 'The Abyss',
    'The Demonic Pact', 'The Final Ascension'
  ];
  return names[Math.min(stage - 1, names.length - 1)] || 'The Unknown Realm';
}

function SeededRandom(seed) {
  this.seed = seed % 2147483647;
  if (this.seed <= 0) this.seed += 2147483646;
}

SeededRandom.prototype.next = function() {
  this.seed = (this.seed * 16807) % 2147483647;
  return (this.seed - 1) / 2147483646;
};

SeededRandom.prototype.nextInt = function(min, max) {
  return Math.floor(this.next() * (max - min + 1)) + min;
};

module.exports = {
  generatePassword,
  generateUploadToken,
  calculatePointsRequired,
  getStageName,
  SeededRandom
};
