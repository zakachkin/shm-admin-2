import { useEffect, useState } from 'react';
import { Users, Package, Server, CreditCard, Activity, TrendingUp } from 'lucide-react';
import { shm_request } from '../lib/shm_request';

interface Stats {
  users?: number;
  services?: number;
  servers?: number;
  pays?: number;
}

function Dashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, servicesRes, serversRes] = await Promise.all([
          shm_request('/shm/v1/admin/user?limit=1').catch(() => ({ total: 0 })),
          shm_request('/shm/v1/admin/service?limit=1').catch(() => ({ total: 0 })),
          shm_request('/shm/v1/admin/server?limit=1').catch(() => ({ total: 0 })),
        ]);
        setStats({
          users: usersRes.total || 0,
          services: servicesRes.total || 0,
          servers: serversRes.total || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: 'Пользователи', value: stats.users, icon: Users, color: 'cyan' },
    { title: 'Услуги', value: stats.services, icon: Package, color: 'emerald' },
    { title: 'Серверы', value: stats.servers, icon: Server, color: 'violet' },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <h2 className="text-xl font-bold">Главная</h2>
        </div>
        <p style={{ color: 'var(--theme-content-text-muted)' }}>Обзор системы SHM</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{card.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {loading ? '...' : (card.value ?? '-')}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-${card.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${card.color}-400`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Добро пожаловать в SHM Admin
          </h2>
        </div>
        <div className="card-body">
          <p className="text-slate-400">
            Используйте меню слева для навигации по разделам системы.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
