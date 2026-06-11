import { useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PieChart, TrendingUp, Users, Receipt, ArrowRight, BarChart3, Calendar as CalendarIcon, Flame, X } from 'lucide-react';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import PieChartComponent from '@/components/PieChart';
import { CATEGORY_CONFIG, CATEGORY_CHART_COLORS } from '@/constants';
import { calculateCategoryStats } from '@/utils/calculation';
import { formatMoney, formatDateCN, round2 } from '@/utils/id';

export default function StatisticsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTrip, tripBills, tripMembers, totalExpense } = useCurrentTrip();

  const highlightDateRef = useRef<HTMLDivElement>(null);

  const highlightedDate = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('date') || '';
  }, [location.search]);

  const clearHighlight = () => {
    navigate('/statistics', { replace: true });
  };

  const categoryStats = calculateCategoryStats(tripBills);
  const perPersonAvg = tripMembers.length > 0 ? totalExpense / tripMembers.length : 0;

  const budgetPerPerson = currentTrip?.budgetPerPerson || 0;
  const totalBudget = budgetPerPerson * tripMembers.length;

  const dailyStats = useMemo(() => {
    const byDate: Record<string, { date: string; amount: number; count: number; overspent: boolean; remainingAfter: number }> = {};
    tripBills.forEach((b) => {
      if (!byDate[b.date]) {
        byDate[b.date] = { date: b.date, amount: 0, count: 0, overspent: false, remainingAfter: 0 };
      }
      byDate[b.date].amount = round2(byDate[b.date].amount + b.amount);
      byDate[b.date].count += 1;
    });
    const dates = Object.keys(byDate).sort((a, b) => a.localeCompare(b));
    let cum = 0;
    dates.forEach((d) => {
      cum = round2(cum + byDate[d].amount);
      byDate[d].remainingAfter = round2(totalBudget - cum);
      byDate[d].overspent = totalBudget > 0 && byDate[d].remainingAfter < 0;
    });
    return dates.map((d) => byDate[d]);
  }, [tripBills, totalBudget]);

  const maxDaily = dailyStats.length > 0 ? Math.max(...dailyStats.map((s) => s.amount)) : 0;

  useEffect(() => {
    if (highlightedDate && highlightDateRef.current) {
      setTimeout(() => {
        highlightDateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightedDate]);

  if (!currentTrip) {
    return (
      <PageLayout title="消费统计">
        <EmptyState
          icon={<PieChart className="w-10 h-10" />}
          title="请先选择一个旅行"
          description="在行程页面创建或选择一个旅行后，才能查看统计数据"
          action={
            <button
              onClick={() => navigate('/trips')}
              className="px-6 py-3 bg-primary-500 text-white rounded-full font-medium shadow-lg shadow-primary-500/30 active:scale-95 transition-all flex items-center gap-2"
            >
              去选择旅行
              <ArrowRight className="w-4 h-4" />
            </button>
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="消费统计">
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gradient-to-br from-primary-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-primary-500/20">
          <div className="flex items-center gap-1.5 text-primary-100 text-xs mb-1.5">
            <Receipt className="w-3.5 h-3.5" />
            总消费
          </div>
          <div className="text-2xl font-bold">{formatMoney(totalExpense)}</div>
          <div className="text-xs text-primary-100 mt-1">{tripBills.length} 笔账单</div>
        </div>
        <div className="bg-gradient-to-br from-accent-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-accent-500/20">
          <div className="flex items-center gap-1.5 text-orange-100 text-xs mb-1.5">
            <Users className="w-3.5 h-3.5" />
            人均消费
          </div>
          <div className="text-2xl font-bold">
            {tripMembers.length > 0 ? formatMoney(perPersonAvg) : '—'}
          </div>
          <div className="text-xs text-orange-100 mt-1">{tripMembers.length} 人参与</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-500" />
          消费分类占比
        </h3>
        {categoryStats.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">暂无消费数据</div>
        ) : (
          <PieChartComponent data={categoryStats} />
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary-500" />
          分类消费明细
        </h3>
        {categoryStats.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">暂无消费数据</div>
        ) : (
          <div className="space-y-4">
            {categoryStats
              .sort((a, b) => b.amount - a.amount)
              .map((stat) => {
                const config = CATEGORY_CONFIG[stat.category];
                const percent = totalExpense > 0 ? (stat.amount / totalExpense) * 100 : 0;
                return (
                  <div key={stat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_CHART_COLORS[stat.category] }}
                        />
                        <span className="text-sm font-medium text-gray-700">{config.label}</span>
                        <span className="text-xs text-gray-400">({stat.count}笔)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-800">
                          {formatMoney(stat.amount)}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">{percent.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: CATEGORY_CHART_COLORS[stat.category],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {dailyStats.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              每日消费明细
            </h3>
            {highlightedDate && (
              <button
                onClick={clearHighlight}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary-50 text-primary-600 text-xs"
              >
                已定位到 {formatDateCN(highlightedDate)}
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {dailyStats.map((stat) => {
              const isHighlighted = stat.date === highlightedDate;
              return (
                <div
                  key={stat.date}
                  ref={isHighlighted ? highlightDateRef : null}
                  className={`p-3 rounded-xl transition-all ${
                    isHighlighted
                      ? 'ring-2 ring-primary-500 ring-offset-2 scale-[1.02] bg-primary-50 border-2 border-primary-200'
                      : stat.overspent
                      ? 'bg-red-50 border border-red-100'
                      : 'bg-gray-50'
                  }`}
                >
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className={`w-3.5 h-3.5 ${stat.overspent ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${stat.overspent ? 'text-red-700' : 'text-gray-700'}`}>
                    {formatDateCN(stat.date)}
                  </span>
                  {stat.overspent && (
                    <span className="flex items-center gap-0.5 text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                      <Flame className="w-3 h-3" />
                      超支日
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-500">{stat.count}笔</span>
                  <span className={`text-sm font-bold ${stat.overspent ? 'text-red-600' : 'text-gray-800'}`}>
                    {formatMoney(stat.amount)}
                  </span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stat.overspent ? 'bg-red-400' : 'bg-primary-500'}`}
                    style={{ width: `${maxDaily > 0 ? Math.min((stat.amount / maxDaily) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
