import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, Check, X, Wallet, TrendingUp, TrendingDown, Minus, ArrowRight as ArrowRightIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import MemberAvatar from '@/components/MemberAvatar';
import { formatMoney } from '@/utils/id';

export default function SettlementPage() {
  const navigate = useNavigate();
  const { currentTrip, tripMembers, transfers, memberBalances, memberMap, tripSettlements, totalExpense, tripAdvances } = useCurrentTrip();
  const { markSettlement } = useStore();

  const isSettled = (fromId: string, toId: string, amount: number) => {
    return tripSettlements.some(
      (s) =>
        s.fromMemberId === fromId &&
        s.toMemberId === toId &&
        Math.abs(s.amount - amount) < 0.01 &&
        s.settled
    );
  };

  if (!currentTrip) {
    return (
      <PageLayout title="费用结算">
        <EmptyState
          icon={<ArrowLeftRight className="w-10 h-10" />}
          title="请先选择一个旅行"
          description="在行程页面创建或选择一个旅行后，才能进行费用结算"
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

  const settledCount = tripSettlements.filter((s) => s.settled).length;

  return (
    <PageLayout title="费用结算">
      <div className="mb-4 p-5 bg-gradient-to-br from-primary-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-primary-500/20">
        <div className="text-sm text-primary-100 mb-1">{currentTrip.name} · 总消费</div>
        <div className="text-3xl font-bold mb-3">{formatMoney(totalExpense)}</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <div className="text-xs text-primary-100">人数</div>
            <div className="text-lg font-bold">{tripMembers.length}</div>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <div className="text-xs text-primary-100">待转账</div>
            <div className="text-lg font-bold">{transfers.length - settledCount}</div>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <div className="text-xs text-primary-100">已结清</div>
            <div className="text-lg font-bold">{settledCount}</div>
          </div>
        </div>
      </div>

      {tripAdvances.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-800">预付款登记</span>
          </div>
          <div className="space-y-2">
            {tripAdvances.map((a) => {
              const m = memberMap[a.memberId];
              if (!m) return null;
              return (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <MemberAvatar name={m.name} color={m.color} size="sm" />
                  <span className="text-gray-700 flex-1">
                    {m.name}
                    {a.note && <span className="text-gray-400 ml-1">({a.note})</span>}
                  </span>
                  <span className="font-semibold text-amber-700">{formatMoney(a.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {memberBalances.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">各成员收支明细</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {memberBalances.map((b) => {
              const m = memberMap[b.memberId];
              if (!m) return null;
              const statusIcon =
                b.balance > 0.01 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : b.balance < -0.01 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                );
              return (
                <div key={b.memberId} className="p-4 flex items-center gap-3">
                  <MemberAvatar name={m.name} color={m.color} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{m.name}</div>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      <span>已付 {formatMoney(b.paid)}</span>
                      <span>应付 {formatMoney(b.shouldPay)}</span>
                      {b.advance > 0 && <span>预付 {formatMoney(b.advance)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {statusIcon}
                    <span
                      className={`text-lg font-bold ${
                        b.balance > 0.01
                          ? 'text-emerald-600'
                          : b.balance < -0.01
                          ? 'text-red-500'
                          : 'text-gray-500'
                      }`}
                    >
                      {b.balance > 0.01 ? '+' : ''}
                      {formatMoney(b.balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">转账方案</h3>
        {transfers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-14 h-14 rounded-full bg-emerald-100 mx-auto mb-3 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="text-lg font-semibold text-gray-800 mb-1">已全部结清</div>
            <div className="text-sm text-gray-500">太棒了！所有费用已经平摊完毕 🎉</div>
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((t, idx) => {
              const from = memberMap[t.fromMemberId];
              const to = memberMap[t.toMemberId];
              if (!from || !to) return null;
              const settled = isSettled(t.fromMemberId, t.toMemberId, t.amount);
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                    settled ? 'border-gray-100 opacity-60' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={from.name} color={from.color} />
                      <span className={`font-medium ${settled ? 'text-gray-400' : 'text-gray-800'}`}>
                        {from.name}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-1.5 text-gray-400">
                      <ArrowRightIcon className={`w-5 h-5 ${settled ? 'text-gray-300' : 'text-primary-500'}`} />
                      <span className={`text-lg font-bold ${settled ? 'text-gray-400 line-through' : 'text-primary-600'}`}>
                        {formatMoney(t.amount)}
                      </span>
                      <ArrowRightIcon className={`w-5 h-5 ${settled ? 'text-gray-300' : 'text-primary-500'}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${settled ? 'text-gray-400' : 'text-gray-800'}`}>
                        {to.name}
                      </span>
                      <MemberAvatar name={to.name} color={to.color} />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-50 flex justify-center">
                    <button
                      onClick={() =>
                        markSettlement(t.fromMemberId, t.toMemberId, t.amount, !settled)
                      }
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                        settled
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center gap-1.5'
                          : 'bg-primary-500 text-white shadow-md shadow-primary-500/30 hover:bg-primary-600 active:scale-95 flex items-center gap-1.5'
                      }`}
                    >
                      {settled ? (
                        <>
                          <X className="w-4 h-4" />
                          取消结清
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          标记已结清
                        </>
                      )}
                    </button>
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
