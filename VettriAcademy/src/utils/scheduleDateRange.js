// Use local calendar boundaries, then send exact timestamps to the schedule API.
export function getScheduleDateRange(period, selectedDate) {
  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (period === 'weekly') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  } else if (period === 'monthly') {
    start.setDate(1);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
  }
  end.setHours(23, 59, 59, 999);
  return { start, end, from: start.toISOString(), to: end.toISOString() };
}

export function shiftScheduleDate(period, selectedDate, direction) {
  const next = new Date(selectedDate);
  if (period === 'monthly') {
    next.setDate(1);
    next.setMonth(next.getMonth() + direction);
  } else {
    next.setDate(next.getDate() + direction * (period === 'weekly' ? 7 : 1));
  }
  return next;
}
