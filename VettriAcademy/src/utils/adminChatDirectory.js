const id = value => String(value?._id || value || '');
const count = (value, userId) => Math.max(0, Number(typeof value === 'number' ? value : value?.get?.(userId) ?? value?.[userId]) || 0);

export function buildAdminChatDirectory(users = [], conversations = [], adminId) {
  const me = id(adminId), contacts = new Map(users.map(user => {
    const row = { ...user };
    if (row.conversationId && !String(row.conversationId).split('_').includes(me)) {
      delete row.conversationId;
      row.lastMessage = ''; row.lastMessageAt = null; row.lastMessageBy = ''; row.unreadCount = 0;
    }
    return [id(user), row];
  })), recent = new Map();
  if (!me) return { contacts: [...contacts.values()], recent: [] };
  for (const conversation of conversations) {
    const participants = conversation.participants || [];
    if (!participants.some(person => id(person) === me)) continue;
    const other = participants.find(person => id(person) && id(person) !== me);
    if (!other) continue;
    const contact = contacts.get(id(other));
    if (!contact && typeof other !== 'object') continue;
    const row = {
      ...(typeof other === 'object' ? other : {}), ...contact,
      _id: id(other), conversationId: conversation.conversationId,
      lastMessage: conversation.lastMessage || '',
      lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
      lastMessageBy: id(conversation.lastMessageBy),
      unreadCount: count(conversation.unreadCount, me),
    };
    if (contact) contacts.set(row._id, row);
    if (row.lastMessage || conversation.lastMessageAt || row.unreadCount) recent.set(row._id, row);
  }
  return { contacts: [...contacts.values()], recent: [...recent.values()].sort((a, b) => (Date.parse(b.lastMessageAt) || 0) - (Date.parse(a.lastMessageAt) || 0) || String(a.name || '').localeCompare(String(b.name || ''))) };
}

export function adminChatPreview(row, adminId) {
  if (!row.lastMessage) return row.unreadCount ? 'New message — open conversation' : 'Tap to start direct messaging';
  if (row.lastMessageBy === id(adminId)) return `You: ${row.lastMessage}`;
  return row.lastMessageBy ? `${row.displayName || row.name || 'Contact'}: ${row.lastMessage}` : row.lastMessage;
}
