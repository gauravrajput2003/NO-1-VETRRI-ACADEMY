const cron = require('node-cron');
const service = require('../services/passwordRecoveryService');
let running = false;
function startPasswordRecoveryJob() {
  const run = async () => {
    if (running) return;
    running = true;
    try { while (await service.expire() === 100) { /* Drain expired batches. */ } }
    catch (error) { console.error('[Recovery] Cleanup unavailable:', error.name); }
    finally { running = false; }
  };
  cron.schedule('* * * * *', run);
  run();
}
module.exports = { startPasswordRecoveryJob };
