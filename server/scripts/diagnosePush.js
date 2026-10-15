// Read-only: never sends notifications or prints tokens, message bodies or secrets.
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { getPushDiagnostics } = require('../services/pushDiagnostics');

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
    console.log(JSON.stringify(await getPushDiagnostics(), null, 2));
  } finally { await mongoose.disconnect(); }
}
main().catch((error) => { console.error('Push diagnostics failed:', error.name); process.exitCode = 1; });
