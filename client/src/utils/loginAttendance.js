const academyDay = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const instant = (value) => value ? new Date(value).getTime() : NaN;
const minutesValue = (value) => {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
};

export function loginSessionDisplay(log, now = Date.now()) {
  const started = instant(log.loginTime);
  const ended = instant(log.logoutTime);
  const stored = minutesValue(log.sessionDuration) ?? minutesValue(log.duration);
  const ongoing = !log.logoutTime && Number.isFinite(started) && started <= now
    && academyDay(new Date(started)) === academyDay(new Date(now));
  let duration = stored;
  if (ongoing) duration = Math.max(stored ?? 0, Math.floor((now - started) / 60000));
  else if (duration === null && Number.isFinite(started) && Number.isFinite(ended) && ended >= started) duration = Math.round((ended - started) / 60000);
  return { ...log, duration, ongoing };
}

export function loginDurationSummary(logs) {
  const known = logs.filter((log) => minutesValue(log.duration) !== null);
  return {
    average: known.length ? Math.round(known.reduce((sum, log) => sum + Number(log.duration), 0) / known.length) : null,
    missing: logs.length - known.length,
  };
}

export function formatAttendanceDuration(value) {
  const minutes = minutesValue(value);
  if (minutes === null) return 'NA';
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  return hours ? `${hours}h ${rounded % 60}m` : `${rounded}m`;
}
