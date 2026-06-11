import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight as ArrowRightIcon,
  Clock,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import MemberAvatar from '@/components/MemberAvatar';
import Modal from '@/components/Modal';
import { formatMoney, formatDateCN } from '@/utils/id';
import type { Settlement, Transfer } from '@/types';

interface TransferWithSettlement extends Transfer {
  settlement?: Settlement;
  fromConfirmed: boolean;
  toConfirmed: boolean;
  fullyConfirmed: boolean;
}

export default function SettlementPage() {
  const navigate = useNavigate();
  const { currentTrip, tripMembers, transfers, memberBalances, memberMap, tripSettlements, totalExpense, tripAdvances } =
    useCurrentTrip();
  const { markSettlement, confirmSettlement, unconfirmSettlement } = useStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<TransferWithSettlement | null>(null);

  const enrichedTransfers: TransferWithSettlement[] = transfers.map((t) => {
    const s = tripSettlements.find(
      (s) =>
        s.fromMemberId === t.fromMemberId &&
        s.toMemberId === t.toMemberId &&
        Math.abs(s.amount - t.amount) < 0.01
    );
    const fromConfirmed = !!s?.fromConfirmed;
    const toConfirmed = !!s?.toConfirmed;
    return {
      ...t,
      settlement: s,
      fromConfirmed,
      toConfirmed,
      fullyConfirmed: fromConfirmed && toConfirmed && !!s?.settled,
    };
  });

  const fullySettledCount = enrichedTransfers.filter((t) => t.fullyConfirmed).length;
  const pendingCount = enrichedTransfers.length - fullySettledCount;
  const pendingTotal = enrichedTransfers
    .filter((t) => !t.fullyConfirmed)
    .reduce((s, t) => s + t.amount, 0);

  const formatConfirmedAt = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleOpenConfirm = (t: TransferWithSettlement) => {
    setActiveTransfer(t);
    setShowConfirmModal(true);
  };

  const handleConfirmAs = (confirmerId: string) => {
    if (!activeTransfer) return;
    confirmSettlement(activeTransfer.fromMemberId, activeTransfer.toMemberId, activeTransfer.amount, confirmerId);
    setShowConfirmModal(false);
    setActiveTransfer(null);
  };

  const handleUnconfirmAs = (confirmerId: string) => {
    if (!activeTransfer) return;
    unconfirmSettlement(activeTransfer.fromMemberId, activeTransfer.toMemberId, activeTransfer.amount, confirmerId);
    setShowConfirmModal(false);
    setActiveTransfer(null);
  };

  const handleMarkSettledDirect = (t: TransferWithSettlement) => {
    markSettlement(t.fromMemberId, t.toMemberId, t.amount, !t.fullyConfirmed);
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

  return (
    <>
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
              <div className="text-xs text-primary-100">待结清</div>
              <div className="text-lg font-bold">{pendingCount}</div>
              {pendingTotal > 0 && <div className="text-[10px] text-primary-100">{formatMoney(pendingTotal)}</div>}
            </div>
            <div className="bg-white/15 rounded-xl py-2">
              <div className="text-xs text-primary-100">已结清</div>
              <div className="text-lg font-bold">{fullySettledCount}</div>
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
          <h3 className="text-sm font-medium text-gray-500 mb-3 px-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            转账方案（双方确认后才算结清）
          </h3>
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
              {enrichedTransfers.map((t, idx) => {
                const from = memberMap[t.fromMemberId];
                const to = memberMap[t.toMemberId];
                if (!from || !to) return null;
                return (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                      t.fullyConfirmed ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={from.name} color={from.color} />
                        <span className={`font-medium ${t.fullyConfirmed ? 'text-gray-400' : 'text-gray-800'}`}>
                          {from.name}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center gap-1.5 text-gray-400">
                        <ArrowRightIcon
                          className={`w-5 h-5 ${t.fullyConfirmed ? 'text-gray-300' : 'text-primary-500'}`}
                        />
                        <span
                          className={`text-lg font-bold ${
                            t.fullyConfirmed ? 'text-gray-400 line-through' : 'text-primary-600'
                          }`}
                        >
                          {formatMoney(t.amount)}
                        </span>
                        <ArrowRightIcon
                          className={`w-5 h-5 ${t.fullyConfirmed ? 'text-gray-300' : 'text-primary-500'}`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${t.fullyConfirmed ? 'text-gray-400' : 'text-gray-800'}`}>
                          {to.name}
                        </span>
                        <MemberAvatar name={to.name} color={to.color} />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div
                        className={`p-2 rounded-lg text-xs ${
                          t.fromConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {t.fromConfirmed ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span className="font-medium">{from.name}</span>
                        </div>
                        {t.fromConfirmed && t.settlement?.fromConfirmed && (
                          <div className="text-[10px] mt-0.5 opacity-75">
                            {formatConfirmedAt(t.settlement.fromConfirmed.confirmedAt)}
                          </div>
                        )}
                      </div>
                      <div
                        className={`p-2 rounded-lg text-xs ${
                          t.toConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {t.toConfirmed ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span className="font-medium">{to.name}</span>
                        </div>
                        {t.toConfirmed && t.settlement?.toConfirmed && (
                          <div className="text-[10px] mt-0.5 opacity-75">
                            {formatConfirmedAt(t.settlement.toConfirmed.confirmedAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2">
                      <button
                        onClick={() => handleOpenConfirm(t)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          t.fullyConfirmed
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-primary-500 text-white shadow-md shadow-primary-500/30 active:scale-95'
                        }`}
                      >
                        {t.fullyConfirmed ? '查看确认详情' : '我要确认 / 查看'}
                      </button>
                      <button
                        onClick={() => handleMarkSettledDirect(t)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          t.fullyConfirmed
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t.fullyConfirmed ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {t.fullyConfirmed && t.settlement?.settledAt && (
                      <div className="mt-2 text-center text-[11px] text-emerald-600">
                        ✅ 已于 {formatConfirmedAt(t.settlement.settledAt)} 双方确认结清
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageLayout>

      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="转账确认">
        {activeTransfer && (
          <div className="p-5 space-y-4">
            {(() => {
              const from = memberMap[activeTransfer.fromMemberId];
              const to = memberMap[activeTransfer.toMemberId];
              if (!from || !to) return null;
              return (
                <>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-500 mb-2">转账信息</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MemberAvatar name={from.name} color={from.color} />
                        <span className="font-medium text-gray-800">{from.name}</span>
                      </div>
                      <span className="text-primary-600 font-bold">→ {formatMoney(activeTransfer.amount)} →</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{to.name}</span>
                        <MemberAvatar name={to.name} color={to.color} />
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    请选择你是谁，确认这笔转账：
                  </div>

                  <div className="space-y-2">
                    {[from, to].map((person) => {
                      const isFrom = person.id === from.id;
                      const confirmed = isFrom ? activeTransfer.fromConfirmed : activeTransfer.toConfirmed;
                      const confirmInfo = isFrom
                        ? activeTransfer.settlement?.fromConfirmed
                        : activeTransfer.settlement?.toConfirmed;
                      return (
                        <div
                          key={person.id}
                          className={`p-3 rounded-xl border transition-all ${
                            confirmed ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <MemberAvatar name={person.name} color={person.color} />
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">
                                我是 {person.name}
                                {isFrom ? '（付款方）' : '（收款方）'}
                              </div>
                              {confirmed && confirmInfo && (
                                <div className="text-xs text-emerald-600 mt-0.5">
                                  已于 {formatConfirmedAt(confirmInfo.confirmedAt)} 确认
                                </div>
                              )}
                            </div>
                            {confirmed ? (
                              <button
                                onClick={() => handleUnconfirmAs(person.id)}
                                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-medium active:scale-95 transition-all"
                              >
                                取消确认
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConfirmAs(person.id)}
                                className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium shadow-md shadow-primary-500/30 active:scale-95 transition-all flex items-center gap-1"
                              >
                                <Check className="w-4 h-4" />
                                确认
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeTransfer.fromConfirmed && activeTransfer.toConfirmed && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-sm text-emerald-700">
                      ✅ 双方已确认，这笔转账已结清！
                    </div>
                  )}

                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
                  >
                    关闭
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </>
  );
}
