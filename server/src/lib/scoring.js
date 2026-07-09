export const BASE_POINTS = 1000;

// Compares a participant's chosen options against the correct set.
// All-or-nothing: for multiple-choice the selection must match the correct set
// exactly (no partial credit).
export function isAnswerCorrect(correctOptionIds, selectedOptionIds) {
  const correct = new Set(correctOptionIds);
  const selected = new Set(selectedOptionIds);
  if (correct.size !== selected.size) return false;
  for (const id of correct) {
    if (!selected.has(id)) return false;
  }
  return true;
}

// Points for a correct answer. With speed bonus enabled, points scale linearly
// from BASE_POINTS (instant) down to BASE_POINTS/2 (answered at the buzzer),
// so a correct answer always beats a wrong one. Wrong answers score 0.
export function computeScore({ correct, speedBonus, timeLeftMs, timeLimitMs }) {
  if (!correct) return 0;
  if (!speedBonus) return BASE_POINTS;
  const ratio = Math.max(0, Math.min(1, timeLeftMs / timeLimitMs));
  return Math.round(BASE_POINTS * (0.5 + 0.5 * ratio));
}
