import { shm_request, normalizeListResponse, shm_request_with_status } from './shm_request';

export interface DashboardAnalytics {
  counts: {
    totalUsers: number;
    activeUserServices: number;
    totalServers: number;
  };
  payments: {
    timeline: { date: string; value: number; label?: string }[];
  };
  revenue: {
    totalRevenue: number;
    totalWithdraws: number;
    netRevenue: number;
  };
  services: {
    byStatus: { name: string; value: number; color?: string }[];
  };
}

const DASHBOARD_CACHE_TTL_MS = 30000;
let dashboardCache: { key: string; data: DashboardAnalytics; timestamp: number } | null = null;

export async function fetchDashboardAnalytics(period: number = 7): Promise<DashboardAnalytics> {
  try {
    // Вычисляем даты для периода
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const start = formatDate(startDate);
    const stop = formatDate(endDate);
    const cacheKey = `${start}:${stop}`;
    if (dashboardCache && dashboardCache.key === cacheKey) {
      const age = Date.now() - dashboardCache.timestamp;
      if (age < DASHBOARD_CACHE_TTL_MS) {
        return dashboardCache.data;
      }
    }

    console.log(`[Dashboard] Fetching data for period: ${start} to ${stop}`);
    // Параллельные запросы к API - только данные за период
    const results = await Promise.allSettled([
      shm_request('shm/v1/admin/user?limit=1'),
      shm_request(`shm/v1/admin/user?start=${start}&stop=${stop}&field=created&limit=9999`),
      shm_request(`shm/v1/admin/user/service?start=${start}&stop=${stop}&field=created&limit=5000`),
      shm_request_with_status('shm/v1/admin/server?limit=1'),
      shm_request(`shm/v1/admin/user/pay?start=${start}&stop=${stop}&field=date&limit=9999`),
      shm_request(`shm/v1/admin/user/service/withdraw?start=${start}&stop=${stop}&field=create_date&limit=9999`),
    ]);

    const [
      usersCountRes,
      usersNewRes,
      userServicesNewRes,
      serversCountRes,
      paymentsRes,
      withdrawsRes,
    ] = results.map((result) => (result.status === 'fulfilled' ? result.value : null));

    // Нормализация данных
    const totalUsersCount = usersCountRes?.items || usersCountRes?.total || 0;
    const usersNew = usersNewRes ? normalizeListResponse(usersNewRes).data : [];
    const userServicesNew = userServicesNewRes ? normalizeListResponse(userServicesNewRes).data : [];
    const serversCountPayload =
      serversCountRes && serversCountRes.status === 429 ? null : serversCountRes?.data;
    const totalServersCount = serversCountPayload?.items || serversCountPayload?.total || 0;
    const payments = paymentsRes ? normalizeListResponse(paymentsRes).data : [];
    const withdraws = withdrawsRes ? normalizeListResponse(withdrawsRes).data : [];

    // Фильтрация "реальных" платежей (без manual)
    const realPayments = payments.filter((p: any) =>
      p.pay_system_id &&
      p.pay_system_id !== '' &&
      p.pay_system_id !== '0' &&
      p.pay_system_id.toLowerCase() !== 'manual'
    );
    const completedWithdraws = withdraws.filter(
      (withdraw: any) => withdraw?.end_data != null || withdraw?.end_date != null
    );
    const getPaymentAmount = (payment: any) => {
      const amount = parseFloat(payment.money || 0);
      return Number.isFinite(amount) ? amount : 0;
    };

    // Подсчеты
    const totalRevenue = realPayments.reduce((sum: number, p: any) => sum + getPaymentAmount(p), 0);
    const totalWithdraws = completedWithdraws.reduce((sum: number, w: any) => sum + parseFloat(w.cost || 0), 0);
    const activeUserServices = userServicesNew.filter((us: any) => us.status === 'ACTIVE' || us.status === 'active').length;

    // Группировка платежей по датам
    const paymentsByDate: Record<string, number> = {};
    realPayments.forEach((p: any) => {
      const date = p.date.split('T')[0];
      paymentsByDate[date] = (paymentsByDate[date] || 0) + getPaymentAmount(p);
    });

    // Статистика по статусам сервисов
    const servicesByStatus: Record<string, number> = {};
    userServicesNew.forEach((us: any) => {
      servicesByStatus[us.status] = (servicesByStatus[us.status] || 0) + 1;
    });

    const result: DashboardAnalytics = {
      counts: {
        totalUsers: totalUsersCount,
        activeUserServices: activeUserServices,
        totalServers: totalServersCount,
      },
      payments: {
        timeline: Object.entries(paymentsByDate).map(([date, value]) => ({ date, value })),
      },
      revenue: {
        totalRevenue,
        totalWithdraws,
        netRevenue: totalRevenue - totalWithdraws,
      },
      services: {
        byStatus: Object.entries(servicesByStatus).map(([name, value]) => ({ name, value })),
      },
    };
    dashboardCache = { key: cacheKey, data: result, timestamp: Date.now() };
    console.log('[Dashboard] Analytics fetched successfully');
    return result;

  } catch (error) {
    throw error;
  }
}




