// HEALTH SCORE (0-100) — used on /health page
export function computeHealthScore({
  waterMl,
  waterGoalMl,
  sleepHours,
  sleepGoalHours,
  steps,
  stepGoal,
}: {
  waterMl: number;
  waterGoalMl: number;
  sleepHours: number;
  sleepGoalHours: number;
  steps: number;
  stepGoal: number;
}) {
  const waterGoal = waterGoalMl || 2000;
  const sleepGoal = sleepGoalHours || 8;
  const stepsGoal = stepGoal || 8000;

  const waterPct = Math.min(waterMl / waterGoal, 1) * 100;
  const sleepPct = Math.min(sleepHours / sleepGoal, 1) * 100;
  const stepsPct = Math.min(steps / stepsGoal, 1) * 100;

  return Math.round(waterPct * 0.35 + sleepPct * 0.4 + stepsPct * 0.25);
}

// LIFE SCORE (0-100) — used on dashboard
export function computeLifeScore({
  habitsPct,
  tasksPct,
  healthScore,
  focusMinutes,
  focusGoalMinutes,
}: {
  habitsPct: number;
  tasksPct: number;
  healthScore: number;
  focusMinutes: number;
  focusGoalMinutes: number;
}) {
  const focusGoal = focusGoalMinutes || 60;
  const focusPct = Math.min(focusMinutes / focusGoal, 1) * 100;

  return Math.round(
    habitsPct * 0.3 +     // 30% — habits completed today
      tasksPct * 0.25 +   // 25% — tasks completed today
      healthScore * 0.3 + // 30% — health score
      focusPct * 0.15     // 15% — focus minutes vs goal
  );
}
