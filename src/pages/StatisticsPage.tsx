import { useNavigate } from 'react-router-dom';
import { PieChart, TrendingUp, Users, Receipt, ArrowRight } from 'lucide-react';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import PieChartComponent from '@/components/PieChart';
import { CATEGORY_CONFIG, CATEGORY_CHART_COLORS } from '@/constants';
import { calculateCategoryStats } from '@/utils/calculation';
import { formatMoney } from '@/utils/id';

export default function StatisticsPage() {
  const navigate = useNavigate();
  const { currentTrip, tripBills, tripMembers, totalExpense } = useCurrentTrip();

  const categoryStats = calculateCategoryStats(tripBills);
  const perPersonAvg = tripMembers.length > 0 ? totalExpense / tripMembers.length : 0;

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
    </PageLayout>
  );
}
