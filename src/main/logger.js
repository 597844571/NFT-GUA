class Logger {
  constructor(onPush) {
    this.logs = [];
    this.onPush = onPush;
  }

  _push(level, message, meta = {}) {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString(),
      level,
      message,
      ...meta,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 500) this.logs.pop();
    if (this.onPush) this.onPush(entry);
  }

  info(msg, meta) { this._push('info', msg, meta); }
  success(msg, meta) { this._push('success', msg, meta); }
  warn(msg, meta) { this._push('warn', msg, meta); }
  error(msg, meta) { this._push('error', msg, meta); }

  getLogs() { return this.logs; }
  clear() { this.logs = []; }
}

module.exports = Logger;
