import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_SETTINGS, DEFAULT_PLATFORMS } from '@shared/constants';
import { api } from '../api';

const STORAGE_KEYS = {
  accounts: 'dcautobot_accounts',
  tasks: 'dcautobot_tasks',
  settings: 'dcautobot_settings',
  monitors: 'dcautobot_monitors',
  platforms: 'dcautobot_platforms',
};

function getStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useAutoBotStorage() {
  const [accounts, setAccountsState] = useState(() => getStorage(STORAGE_KEYS.accounts, []));
  const [tasks, setTasksState] = useState(() => getStorage(STORAGE_KEYS.tasks, []));
  const [settings, setSettingsState] = useState(() => getStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS));
  const [monitors, setMonitorsState] = useState(() => getStorage(STORAGE_KEYS.monitors, []));
  const [platforms, setPlatformsState] = useState(() => {
    const saved = getStorage(STORAGE_KEYS.platforms, null);
    if (saved === null) {
      setStorage(STORAGE_KEYS.platforms, DEFAULT_PLATFORMS);
      return DEFAULT_PLATFORMS;
    }
    return saved;
  });
  const [logs, setLogsState] = useState([]);
  const [engineStatus, setEngineStatus] = useState({ status: 'stopped' });
  const [monitorResults, setMonitorResults] = useState({});

  // 监听后端推送
  useEffect(() => {
    const handleLog = (entry) => setLogsState((prev) => [entry, ...prev].slice(0, 500));
    const handleStatus = (status) => setEngineStatus(status);
    const handleMonitor = (result) => {
      setMonitorResults((prev) => ({ ...prev, [result.id]: result }));
    };

    api.onLog(handleLog);
    api.onEngineStatus(handleStatus);
    api.onMonitorUpdate(handleMonitor);

    // 初始化获取日志和状态
    api.getLogs().then((history) => {
      if (history?.length) setLogsState(history);
    });
    api.getEngineStatus().then((s) => setEngineStatus(s));

    return () => {
      api.removeAllListeners('log');
      api.removeAllListeners('status');
      api.removeAllListeners('monitor');
    };
  }, []);

  const setAccounts = useCallback((next) => {
    setAccountsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      setStorage(STORAGE_KEYS.accounts, value);
      return value;
    });
  }, []);

  const setTasks = useCallback((next) => {
    setTasksState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      setStorage(STORAGE_KEYS.tasks, value);
      return value;
    });
  }, []);

  const setSettings = useCallback((next) => {
    setSettingsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      setStorage(STORAGE_KEYS.settings, value);
      return value;
    });
  }, []);

  const setMonitors = useCallback((next) => {
    setMonitorsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      setStorage(STORAGE_KEYS.monitors, value);
      return value;
    });
  }, []);

  const setPlatforms = useCallback((next) => {
    setPlatformsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      setStorage(STORAGE_KEYS.platforms, value);
      return value;
    });
  }, []);

  const addLog = useCallback((level, message, meta = {}) => {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString(),
      level,
      message,
      ...meta,
    };
    setLogsState((prev) => [entry, ...prev].slice(0, 500));
    return entry;
  }, []);

  const clearLogs = useCallback(() => {
    setLogsState([]);
    api.clearLogs();
  }, []);

  return {
    accounts,
    setAccounts,
    tasks,
    setTasks,
    settings,
    setSettings,
    monitors,
    setMonitors,
    platforms,
    setPlatforms,
    logs,
    addLog,
    clearLogs,
    engineStatus,
    monitorResults,
  };
}
