const cron = require('node-cron');
const { generateMonth } = require('../services/teacherPerformanceService');
let running = false;
async function runPerformanceCycle(now = new Date()) {
  if (running) return;
  running = true;
  try {
    const local = new Date(+now + 330 * 60000);
    await generateMonth(local.getUTCMonth() + 1, local.getUTCFullYear(), now);
    const previous = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 15));
    await generateMonth(previous.getUTCMonth() + 1, previous.getUTCFullYear(), now);
  } finally { running = false; }
}
function startTeacherPerformanceJob() {
  const run = () => runPerformanceCycle().catch((error) => console.error('[Teacher Performance]', error.message));
  cron.schedule('15 1 * * *', run, { timezone: 'Asia/Kolkata' });
  run(); // Catch up after Render restarts; report requests also regenerate their month.
}
module.exports = { runPerformanceCycle, startTeacherPerformanceJob };
