const levels = ['error', 'warn', 'info', 'debug'];
const env = require('../config/env');

const currentLevelIndex = levels.indexOf(env.logging.level) === -1
    ? levels.indexOf('info')
    : levels.indexOf(env.logging.level);

function shouldLog(level) {
    return levels.indexOf(level) <= currentLevelIndex;
}

function log(level, ...args) {
    if (!shouldLog(level)) return;
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console[level](`[${timestamp}] [${level.toUpperCase()}]`, ...args);
}

module.exports = {
    error: (...args) => log('error', ...args),
    warn: (...args) => log('warn', ...args),
    info: (...args) => log('info', ...args),
    debug: (...args) => log('debug', ...args)
};
