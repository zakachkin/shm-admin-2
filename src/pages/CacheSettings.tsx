import React from 'react';
import { useCacheStore } from '../store/cacheStore';
import { useThemeStore } from '../store/themeStore';
import { Timer, Trash2, ToggleLeft, ToggleRight, RefreshCw, Database } from 'lucide-react';

export default function CacheSettings() {
  const { settings, setSettings, clear, getStats } = useCacheStore();
  const { colors } = useThemeStore();
  const [stats, setStats] = React.useState(getStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(getStats());
    }, 1000);
    return () => clearInterval(interval);
  }, [getStats]);

  const handleClearCache = () => {
    if (confirm('Очистить весь кеш?')) {
      clear();
      setStats(getStats());
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.contentText }}>
            Настройки кеширования
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.contentTextMuted }}>
            Управление кешированием данных таблиц
          </p>
        </div>
        <button
          onClick={handleClearCache}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            color: colors.contentText,
          }}
        >
          <Trash2 size={16} />
          Очистить кеш
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="p-6 rounded-lg"
          style={{
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.contentText }}>
            <Timer size={20} />
            Основные настройки
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium" style={{ color: colors.contentText }}>
                  Кеширование
                </label>
                <p className="text-sm mt-1" style={{ color: colors.contentTextMuted }}>
                  Включить кеширование данных таблиц
                </p>
              </div>
              <button
                onClick={() => setSettings({ enabled: !settings.enabled })}
                className="flex items-center gap-2"
                style={{ color: settings.enabled ? colors.primaryColor : colors.contentTextMuted }}
              >
                {settings.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
            </div>

            <div>
              <label className="block font-medium mb-2" style={{ color: colors.contentText }}>
                Время жизни кеша (TTL)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="30"
                  max="3600"
                  step="30"
                  value={settings.ttl}
                  onChange={(e) => setSettings({ ttl: parseInt(e.target.value) })}
                  className="flex-1"
                  style={{ accentColor: colors.primaryColor }}
                />
                <span className="font-mono text-sm w-24" style={{ color: colors.contentText }}>
                  {formatTTL(settings.ttl)}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: colors.contentTextMuted }}>
                Время хранения данных в кеше
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium" style={{ color: colors.contentText }}>
                  Фоновое обновление
                </label>
                <p className="text-sm mt-1" style={{ color: colors.contentTextMuted }}>
                  Обновлять данные в фоне до истечения кеша
                </p>
              </div>
              <button
                onClick={() => setSettings({ backgroundRefresh: !settings.backgroundRefresh })}
                className="flex items-center gap-2"
                style={{ color: settings.backgroundRefresh ? colors.primaryColor : colors.contentTextMuted }}
              >
                {settings.backgroundRefresh ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
            </div>

            {settings.backgroundRefresh && (
              <div>
                <label className="block font-medium mb-2" style={{ color: colors.contentText }}>
                  Порог обновления
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={settings.backgroundRefreshThreshold}
                    onChange={(e) => setSettings({ backgroundRefreshThreshold: parseFloat(e.target.value) })}
                    className="flex-1"
                    style={{ accentColor: colors.primaryColor }}
                  />
                  <span className="font-mono text-sm w-24" style={{ color: colors.contentText }}>
                    {Math.round(settings.backgroundRefreshThreshold * 100)}%
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: colors.contentTextMuted }}>
                  При достижении {Math.round(settings.backgroundRefreshThreshold * 100)}% времени жизни начнется фоновое обновление
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          className="p-6 rounded-lg"
          style={{
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.contentText }}>
            <Database size={20} />
            Статистика кеша
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.contentBg }}>
                <div className="text-2xl font-bold" style={{ color: colors.primaryColor }}>
                  {stats.totalKeys}
                </div>
                <div className="text-sm" style={{ color: colors.contentTextMuted }}>
                  Записей в кеше
                </div>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.contentBg }}>
                <div className="text-2xl font-bold" style={{ color: colors.primaryColor }}>
                  {stats.totalSize}
                </div>
                <div className="text-sm" style={{ color: colors.contentTextMuted }}>
                  Размер кеша
                </div>
              </div>
            </div>

            {stats.entries.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.entries.map((entry) => (
                  <div
                    key={entry.key}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: colors.contentBg,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono truncate" style={{ color: colors.contentText }}>
                          {entry.key}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: colors.contentTextMuted }}>
                          <span>Размер: {entry.size}</span>
                          <span>Возраст: {entry.age}</span>
                          <span>Истекает: {entry.expiresIn}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stats.entries.length === 0 && (
              <div className="text-center py-8" style={{ color: colors.contentTextMuted }}>
                Кеш пуст
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
        }}
      >
        <div className="flex items-start gap-3">
          <RefreshCw size={20} style={{ color: colors.primaryColor, flexShrink: 0 }} />
          <div>
            <h3 className="font-medium mb-1" style={{ color: colors.contentText }}>
              Как работает кеширование?
            </h3>
            <ul className="text-sm space-y-1" style={{ color: colors.contentTextMuted }}>
              <li>• Данные таблиц сохраняются в локальном кеше браузера</li>
              <li>• При повторном открытии таблицы данные загружаются из кеша мгновенно</li>
              <li>• Фоновое обновление обновляет данные незаметно для пользователя</li>
              <li>• Кеш автоматически очищается при выходе или истечении TTL</li>
              <li>• Принудительное обновление (F5 или кнопка обновить) игнорирует кеш</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTTL(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}м`;
  return `${Math.floor(seconds / 3600)}ч ${Math.floor((seconds % 3600) / 60)}м`;
}
