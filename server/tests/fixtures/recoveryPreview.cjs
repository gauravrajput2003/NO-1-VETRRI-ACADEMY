// Local-only UI fixture. No database, real accounts, push provider or messages.
const http = require('node:http');
const admin = { _id: '000000000000000000000001', name: 'Preview Admin', role: 'admin', firstLogin: false, admissionFormFilled: true };
const request = { _id: '000000000000000000000002', requestedAt: new Date().toISOString(), status: 'pending', hasVerifiedDevice: true,
  user: { _id: '000000000000000000000003', name: 'Preview Student', role: 'student', grade: '8th', mobile: '0000000000', email: 'preview@example.invalid' } };
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  let body = ''; for await (const chunk of req) body += chunk;
  let data; try { data = JSON.parse(body || '{}'); } catch { data = {}; }
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  let result = { success: true, notifications: [], announcements: [], conversations: [], users: [], unreadCount: 0, counts: {}, data: [], stats: {} };
  if (path.includes('/auth/login')) result = { success: true, token: 'synthetic-preview-token', refreshToken: 'synthetic-preview-refresh', user: admin };
  else if (path === '/api/auth/me') result = { success: true, user: admin };
  else if (path === '/api/auth/password-reset/request') result = { success: true, message: 'Request sent. Your admin will send you a temporary password.' };
  else if (path === '/api/auth/password-reset/complete') result = { success: true, message: 'Password updated. Please sign in.' };
  else if (path.endsWith('/generate')) { request.hasGeneratedPassword = true; result = { success: true, password: 'Abcd-Ef234', request }; }
  else if (path.endsWith('/send') || path.endsWith('/mark-copied')) { request.status = 'sent'; request.sentAt = new Date().toISOString(); request.tempPasswordExpiresAt = new Date(Date.now() + 86400000).toISOString(); result = { success: true, request }; }
  else if (path === '/api/admin/password-resets') {
    const status = new URL(req.url, 'http://127.0.0.1').searchParams.get('status');
    const records = status === request.status ? [request] : [];
    result = { success: true, requests: records, page: 1, pages: 1, total: records.length, pendingCount: request.status === 'pending' ? 1 : 0 };
  }
  res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result));
});
server.listen(5099, '127.0.0.1', () => console.log('Synthetic recovery UI fixture on 127.0.0.1:5099'));
