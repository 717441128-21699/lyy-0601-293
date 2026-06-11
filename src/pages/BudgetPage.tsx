import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  AlertTriangle,
  Check,
  TrendingUp,
  Target,
  ArrowRight,
  Edit3,
  Calendar as CalendarIcon,
  BarChart3,
  Flame,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { formatMoney, formatDateCN, round2 } from '@/utils/id';
import { CATEGORY_CONFIG } from '@/constants';

interface DailyStat {
  date: string;
  amount: number;
  count: number;
  remainingAfter: number;
  overspent: boolean;
  categories: Record<string, number>;
}

export default function BudgetPage() {
  const navigate = useNavigate();
  const { currentTrip, tripMembers, totalExpense, tripBills } = useCurrentTrip();
  const { updateTrip } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const budgetPerPerson = currentTrip?.budgetPerPerson || 0;
  const totalBudget = budgetPerPerson * tripMembers.length;
  const perPersonSpent = tripMembers.length > 0 ? totalExpense / tripMembers.length : 0;
  const overspent = totalBudget > 0 && totalExpense > totalBudget;
  const remaining = totalBudget - totalExpense;
  const progress = totalBudget > 0 ? Math.min((totalExpense / totalBudget) * 100, 100) : 0;
  const overPercent = totalBudget > 0 && overspent ? ((totalExpense - totalBudget) / totalBudget) * 100 : 0;

  const dailyStats = useMemo((): DailyStat[] => {
    const byDate: Record<string, DailyStat> = {};
    tripBills.forEach((b) => {
      if (!byDate[b.date]) {
        byDate[b.date] = {
          date: b.date,
          amount: 0,
          count: 0,
          remainingAfter: 0,
          overspent: false,
          categories: {},
        };
      }
      byDate[b.date].amount = round2(byDate[b.date].amount + b.amount);
      byDate[b.date].count += 1;
      byDate[b.date].categories[b.category] =
        (byDate[b.date].categories[b.category] || 0) + b.amount;
    });
    const dates = Object.keys(byDate).sort((a, b) => a.localeCompare(b));
    let cumSpent = 0;
    dates.forEach((d) => {
      cumSpent = round2(cumSpent + byDate[d].amount);
      byDate[d].remainingAfter = round2(totalBudget - cumSpent);
      byDate[d].overspent = totalBudget > 0 && byDate[d].remainingAfter < 0;
    });
    return dates.map((d) => byDate[d]);
  }, [tripBills, totalBudget]);

  const maxDailyAmount = useMemo(() => {
    if (dailyStats.length === 0) return 0;
    return Math.max(...dailyStats.map((s) => s.amount));
  }, [dailyStats]);

  const handleOpenModal = () => {
    setBudgetInput(String(currentTrip?.budgetPerPerson || ''));
    setShowModal(true);
  };

  const handleSaveBudget = () => {
    if (!currentTrip) return;
    updateTrip(currentTrip.id, { budgetPerPerson: Number(budgetInput) || 0 });
    setShowModal(false);
  };

  if (!currentTrip) {
    return (
      <PageLayout title="预算管理">
        <EmptyState
          icon={<Wallet className="w-10 h-10" />}
          title="请先选择一个旅行"
          description="在行程页面创建或选择一个旅行后，才能设置预算"
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
    <>
      <PageLayout
        title="预算管理"
        rightAction={
          <button
            onClick={handleOpenModal}
            className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        }
      >
        {overspent && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-pulse-slow">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-red-700">⚠️ 已超出预算</div>
              <div className="text-sm text-red-600 mt-0.5">
                当前总消费已超过总预算 <span className="font-bold">{overPercent.toFixed(1)}%</span>，
                超出金额 <span className="font-bold">{formatMoney(Math.abs(remaining))}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-5 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center mb-6">
            <div className="relative" style={{ width: 180, height: 180 }}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke={overspent ? '#FEE2E2' : '#ECFDF5'}
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke={overspent ? '#EF4444' : '#10B981'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${progress}, 100`}
                  style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xs text-gray-500">已使用</div>
                <div className={`text-2xl font-bold ${overspent ? 'text-red-500' : 'text-gray-800'}`}>
                  {progress.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <Target className="w-3.5 h-3.5" />
                总预算
              </div>
              <div className="text-xl font-bold text-gray-800">
                {totalBudget > 0 ? formatMoney(totalBudget) : '未设置'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                已消费
              </div>
              <div className="text-xl font-bold text-gray-800">{formatMoney(totalExpense)}</div>
            </div>
          </div>

          <div
            className={`mt-3 p-4 rounded-xl flex items-center justify-between ${
              overspent ? 'bg-red-50' : 'bg-emerald-50'
            }`}
          >
            <span className={`text-sm ${overspent ? 'text-red-600' : 'text-emerald-600'}`}>
              {overspent ? '超出预算' : '剩余预算'}
            </span>
            <span
              className={`text-lg font-bold ${overspent ? 'text-red-600' : 'text-emerald-600'}`}
            >
              {overspent ? '-' : ''}
              {formatMoney(Math.abs(remaining))}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary-500" />
            人均预算详情
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-gray-600">设置的人均预算</span>
              <span className="font-semibold text-gray-800">
                {budgetPerPerson > 0 ? formatMoney(budgetPerPerson) : '未设置'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-gray-600">当前人均消费</span>
              <span
                className={`font-semibold ${
                  budgetPerPerson > 0 && perPersonSpent > budgetPerPerson
                    ? 'text-red-500'
                    : 'text-gray-800'
                }`}
              >
                {formatMoney(perPersonSpent)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-gray-600">参与人数</span>
              <span className="font-semibold text-gray-800">{tripMembers.length} 人</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">预算使用进度</span>
              <span
                className={`font-semibold ${
                  overspent ? 'text-red-500' : 'text-primary-600'
                }`}
              >
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {dailyStats.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              每日预算消耗趋势
            </h3>

            <div className="space-y-3">
              {dailyStats.map((stat) => (
                <div
                  key={stat.date}
                  className={`p-3 rounded-xl transition-all ${
                    stat.overspent ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
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

                  <div className="h-2.5 bg-white rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stat.overspent ? 'bg-red-400' : 'bg-primary-500'
                      }`}
                      style={{
                        width: `${maxDailyAmount > 0 ? Math.min((stat.amount / maxDailyAmount) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(stat.categories).map(([cat, amt]) => {
                        const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
                        if (!cfg) return null;
                        return (
                          <span
                            key={cat}
                            className={`px-1.5 py-0.5 rounded ${cfg.bgColor} ${cfg.color} text-[10px]`}
                          >
                            {cfg.label}
                          </span>
                        );
                      })}
                    </div>
                    <span className={stat.overspent ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      当日剩余: {formatMoney(stat.remainingAfter)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {budgetPerPerson === 0 && (
          <div className="mt-4 p-4 bg-primary-50 border border-primary-100 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-primary-700 text-sm">设置预算更合理消费</div>
              <div className="text-xs text-primary-600 mt-0.5">
                点击右上角编辑按钮，设置本次旅行的人均预算
              </div>
            </div>
          </div>
        )}
      </PageLayout>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="设置人均预算">
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">人均预算（元）</label>
            <input
              type="number"
              min="0"
              step="1"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="输入人均预算金额"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800 text-lg font-semibold"
            />
            {tripMembers.length > 0 && (
              <div className="mt-3 text-sm text-gray-500">
                共 <span className="font-medium text-gray-700">{tripMembers.length}</span> 人，
                总预算为{' '}
                <span className="font-medium text-primary-600">
                  {formatMoney((Number(budgetInput) || 0) * tripMembers.length)}
                </span>
              </div>
            )}
          </div>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveBudget}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 active:scale-95 transition-all"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
