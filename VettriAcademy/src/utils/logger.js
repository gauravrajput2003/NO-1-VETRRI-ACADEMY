const isProd = !__DEV__;

export const logDev = (...args) => {
  if (!isProd) console.log(...args);
};

export const warnDev = (...args) => {
  if (!isProd) console.warn(...args);
};

export const errorCrit = (...args) => {
  console.error(...args);
};
