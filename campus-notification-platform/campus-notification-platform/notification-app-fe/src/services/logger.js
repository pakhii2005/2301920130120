

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
};

const formatLogMessage = (level, context, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] [Context: ${context}] -> ${message}`;
};

export const AppLogger = {
  info: (context, message) => {
    const formatted = formatLogMessage(LOG_LEVELS.INFO, context, message);
    console.info(formatted); 
  },
  
  warn: (context, message) => {
    const formatted = formatLogMessage(LOG_LEVELS.WARN, context, message);
    console.warn(formatted);
  },
  
  error: (context, message, exception = null) => {
    const formatted = formatLogMessage(LOG_LEVELS.ERROR, context, message);
    console.error(formatted, exception ? exception : '');
  },

  success: (context, message) => {
    const formatted = formatLogMessage(LOG_LEVELS.SUCCESS, context, message);
    console.log(`%c${formatted}`, 'color: #2e7d32; font-weight: bold;');
  }
};