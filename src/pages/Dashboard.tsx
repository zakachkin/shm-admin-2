import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  Server,
  CreditCard,
  Activity,
  TrendingUp,
  ArrowRight,
  Clock,
  DollarSign,
  CheckCircle,
  RefreshCw,
  Repeat,
  Target,
  PieChart,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { StatCard, StatCardGrid, ChartCard } from '../components/analytics';
import { AreaLineChart, BarChart } from '../components/charts';
import {
  fetchMainStats,
  fetchPaymentStats,
  fetchUserServiceStats,
  fetchRevenueStats,
  fetchFinancialMetrics,
  fetchMRRStats,
  AnalyticsStats,
  PaymentStats,
  UserServiceStats,
  RevenueStats,
  FinancialMetrics,
  MRRStats,
} from '../lib/analyticsApi';

/**
 * Main Dashboard page with key metrics overview
 */
function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [serviceStats, setServiceStats] = useState<UserServiceStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [mrrStats, setMrrStats] = useState<MRRStats | null>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        mainStats,
        payments,
        services,
        revenue,
        financial,
        mrr,
        recentPaysRes,
        tasksRes,
      ] = await Promise.all([
        fetchMainStats(),
        fetchPaymentStats(7),
        fetchUserServiceStats(),
        fetchRevenueStats(7),
        fetchFinancialMetrics(),
        fetchMRRStats(),
        shm_request('/shm/v1/admin/user/pay?limit=5&sort_field=date&sort_direction=DESC').catch(() => ({ data: [] })),
        shm_request('/shm/v1/admin/spool?limit=5').catch(() => ({ data: [] })),
      ]);

      setStats(mainStats);
      setPaymentStats(payments);
      setServiceStats(services);
      setRevenueStats(revenue);
      setFinancialMetrics(financial);
      setMrrStats(mrr);
      
      const { data: pays } = normalizeListResponse(recentPaysRes);
      setRecentPayments(pays);
      
      const { data: tasks } = normalizeListResponse(tasksRes);
      setPendingTasks(tasks);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatMoney = (value: number) => `${value.toLocaleString()} ₽`;
  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Главная</h2>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>
            Обзор системы SHM
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Main KPI Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          title="Пользователи"
          value={stats?.totalUsers ?? '...'}
          icon={Users}
          color="cyan"
          loading={loading}
          onClick={() => window.location.href = '/users'}
        />
        <StatCard
          title="Услуги пользователей"
          value={stats?.activeUserServices ?? '...'}
          icon={Package}
          color="emerald"
          loading={loading}
          onClick={() => window.location.href = '/user-services'}
        />
        <StatCard
          title="Серверы"
          value={stats?.totalServers ?? '...'}
          icon={Server}
          color="violet"
          loading={loading}
          onClick={() => window.location.href = '/servers'}
        />
        <StatCard
          title="Задачи в очереди"
          value={stats?.pendingTasks ?? '...'}
          icon={Clock}
          color="amber"
          loading={loading}
          onClick={() => window.location.href = '/spool'}
        />
      </StatCardGrid>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <StatCard
          title="Выручка (7 дней)"
          value={revenueStats ? formatMoney(revenueStats.totalRevenue) : '...'}
          icon={DollarSign}
          color="emerald"
          loading={loading}
        />
        <StatCard
          title="Списания (7 дней)"
          value={revenueStats ? formatMoney(revenueStats.totalWithdraws) : '...'}
          icon={ArrowDownRight}
          color="rose"
          loading={loading}
        />
        <StatCard
          title="Чистая прибыль"
          value={revenueStats ? formatMoney(revenueStats.netRevenue) : '...'}
          icon={revenueStats && revenueStats.netRevenue >= 0 ? ArrowUpRight : ArrowDownRight}
          color={revenueStats && revenueStats.netRevenue >= 0 ? 'emerald' : 'rose'}
          loading={loading}
        />
      </div>

      {/* Key Financial Metrics */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
            Ключевые метрики
          </h3>
          <Link 
            to="/analytics" 
            className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{ color: 'var(--theme-primary-color)' }}
          >
            Вся аналитика <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="MRR"
            value={mrrStats ? formatMoney(Math.round(mrrStats.mrr)) : '...'}
            icon={Repeat}
            color="emerald"
            subtitle={mrrStats && mrrStats.mrrGrowth !== 0 
              ? `${mrrStats.mrrGrowth > 0 ? '↑' : '↓'} ${Math.abs(mrrStats.mrrGrowth).toFixed(1)}%` 
              : undefined}
            loading={loading}
          />
          <StatCard
            title="ARPU"
            value={financialMetrics ? formatMoney(Math.round(financialMetrics.arpu)) : '...'}
            icon={Target}
            color="blue"
            subtitle="На пользователя"
            loading={loading}
          />
          <StatCard
            title="Конверсия"
            value={financialMetrics ? `${financialMetrics.conversionRate.toFixed(1)}%` : '...'}
            icon={PieChart}
            color={financialMetrics && financialMetrics.conversionRate > 20 ? 'emerald' : 'amber'}
            subtitle={`${financialMetrics?.payingUsersCount || 0} платящих`}
            loading={loading}
          />
          <StatCard
            title="Ср. чек"
            value={financialMetrics ? formatMoney(Math.round(financialMetrics.avgRevenuePerPayment)) : '...'}
            icon={ShoppingCart}
            color="cyan"
            subtitle="На платёж"
            loading={loading}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Revenue Chart */}
        <ChartCard
          title="Динамика платежей"
          subtitle="За последние 7 дней"
          icon={TrendingUp}
          iconColor="text-cyan-400"
          loading={loading}
          actions={
            <Link 
              to="/analytics" 
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-primary-color)' }}
            >
              Подробнее <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {paymentStats && paymentStats.timeline.length > 0 ? (
            <AreaLineChart
              data={paymentStats.timeline}
              height={220}
              color="#22d3ee"
              valueFormatter={formatMoney}
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных о платежах
            </div>
          )}
        </ChartCard>

        {/* Services by Status */}
        <ChartCard
          title="Услуги по статусу"
          subtitle="Текущее распределение"
          icon={Package}
          iconColor="text-violet-400"
          loading={loading}
          actions={
            <Link 
              to="/user-services" 
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-primary-color)' }}
            >
              Все услуги <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {serviceStats && serviceStats.byStatus.length > 0 ? (
            <BarChart
              data={serviceStats.byStatus}
              height={220}
              layout="vertical"
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных об услугах
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Payments */}
        <ChartCard
          title="Последние платежи"
          icon={CreditCard}
          iconColor="text-emerald-400"
          loading={loading}
          actions={
            <Link 
              to="/pays" 
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-primary-color)' }}
            >
              Все платежи <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {recentPayments.length > 0 ? (
            <div className="space-y-1">
              {recentPayments.map((payment, idx) => (
                <div 
                  key={payment.id || idx}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                  style={{ borderColor: 'var(--theme-card-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--theme-content-text)' }}>
                        Пользователь #{payment.user_id}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                        {formatDate(payment.date)}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-emerald-400">
                    +{formatMoney(parseFloat(payment.money) || 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет последних платежей
            </div>
          )}
        </ChartCard>

        {/* Pending Tasks */}
        <ChartCard
          title="Задачи в очереди"
          icon={Activity}
          iconColor="text-amber-400"
          loading={loading}
          actions={
            <Link 
              to="/spool" 
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-primary-color)' }}
            >
              Все задачи <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {pendingTasks.length > 0 ? (
            <div className="space-y-1">
              {pendingTasks.map((task, idx) => (
                <div 
                  key={task.id || idx}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                  style={{ borderColor: 'var(--theme-card-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--theme-content-text)' }}>
                        {typeof task.event === 'string' ? task.event : (task.event?.title || task.event?.name || (typeof task.name === 'string' ? task.name : 'Задача'))}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                        Пользователь #{task.user_id || '-'}
                      </p>
                    </div>
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: 'var(--theme-sidebar-item-active-bg)',
                      color: 'var(--theme-primary-color)',
                    }}
                  >
                    {typeof task.status === 'string' ? task.status : 'pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--theme-content-text-muted)' }}>
              <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
              <p>Нет задач в очереди</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Quick Links */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
          Быстрые действия
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { to: '/users', icon: Users, label: 'Пользователи', color: 'cyan' },
            { to: '/user-services', icon: Package, label: 'Услуги', color: 'emerald' },
            { to: '/pays', icon: CreditCard, label: 'Платежи', color: 'violet' },
            { to: '/servers', icon: Server, label: 'Серверы', color: 'amber' },
            { to: '/spool', icon: Activity, label: 'Задачи', color: 'rose' },
            { to: '/analytics', icon: TrendingUp, label: 'Аналитика', color: 'blue' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-400`} />
              </div>
              <span className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
