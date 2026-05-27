const isProd = process.env.NODE_ENV === 'production';

const logDev = (...args) => {
  if (!isProd) console.log(...args);
};

const warnDev = (...args) => {
  if (!isProd) console.warn(...args);
};

const infoProd = (...args) => {
  console.log(...args);
};

const errorCrit = (...args) => {
  console.error(...args);
};

module.exports = {
  isProd,
  logDev,
  warnDev,
  infoProd,
  errorCrit,
};
