export function initialRecoveryState(prefill) {
  return { phase: prefill ? 'requested' : 'initial', identifier: prefill?.identifier || '',
    tempPassword: prefill?.tempPassword || '', newPassword: '', confirmPassword: '', error: '', requestedAt: 0 };
}
export function recoveryReducer(state, action) {
  switch (action.type) {
    case 'FIELD': return ['identifier', 'tempPassword', 'newPassword', 'confirmPassword'].includes(action.field)
      ? { ...state, [action.field]: action.value, error: '' } : state;
    case 'REQUEST': return { ...state, phase: 'requesting', requestStartedFrom: state.phase, error: '' };
    case 'REQUESTED': return { ...state, phase: 'requested', requestedAt: action.now, error: '' };
    case 'SUBMIT': return { ...state, phase: 'submitting', error: '' };
    case 'ERROR': return { ...state, phase: state.phase === 'requesting' ? (state.requestedAt || state.requestStartedFrom === 'requested' ? 'requested' : 'initial') : 'requested', error: action.message };
    case 'SUCCESS': return { ...initialRecoveryState(), phase: 'success' };
    case 'CHANGE': return { ...initialRecoveryState(), identifier: state.identifier };
    case 'CLEAR': return initialRecoveryState();
    default: return state;
  }
}
export function validRecoveryIdentifier(value) {
  const identifier = String(value || '').trim();
  return identifier.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) && identifier.length <= 254
    : /^(?:\+?91[\s().-]*|0)?(?:[\s().-]*\d){10}$/.test(identifier);
}
export function recoveryNotificationPrefill(data, now = Date.now()) {
  if (data?.type !== 'password_reset' || !validRecoveryIdentifier(data.identifier)
    || typeof data.tempPassword !== 'string' || !/^[A-HJ-NP-Za-km-np-z2-9]{4}-[A-HJ-NP-Za-km-np-z2-9]{5}$/.test(data.tempPassword)
    || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= now) return null;
  return { identifier: data.identifier.trim(), tempPassword: data.tempPassword, standalone: true };
}
