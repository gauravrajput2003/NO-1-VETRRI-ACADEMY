function buildLoginLookup(identifier, role) {
  const raw = String(identifier || '').trim();
  const email = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');
  const mobile = digits.length >= 10 ? digits.slice(-10) : digits;
  const conditions = [{ email }, { mobile: raw }];
  if (mobile) conditions.push({ mobile }, { mobile: `+91${mobile}` }, { mobile: `+91 ${mobile}` });
  const scoped = (query) => role ? { ...query, role } : query;
  const isEmail = raw.includes('@');
  // Match legacy/imported Indian numbers with spaces, dashes, dots or brackets.
  // Only ten literal digits are interpolated; user input cannot inject regex.
  const separator = '[\\s().-]*';
  const pattern = `^${separator}(?:\\+?91${separator}|0${separator})?${mobile.split('').join(separator)}${separator}$`;
  return {
    exactQuery: scoped(isEmail ? { email } : { $or: conditions }),
    formattedQuery: !isEmail && mobile.length === 10 ? scoped({ mobile: new RegExp(pattern) }) : null,
    key: isEmail ? email : mobile || email,
  };
}

module.exports = { buildLoginLookup };
