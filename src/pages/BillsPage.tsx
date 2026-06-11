import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, Trash2, ArrowRight, Calendar as CalendarIcon, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import CategoryIcon from '@/components/CategoryIcon';
import MemberAvatar from '@/components/MemberAvatar';
import { BillCategory, SplitType, BillParticipant } from '@/types';
import { CATEGORY_CONFIG, SPLIT_TYPE_CONFIG } from '@/constants';
import { formatMoney, formatDateCN, todayStr, generateId, round2 } from '@/utils/id';
import { calculateBillShares } from '@/utils/calculation';

export default function BillsPage() {
  const navigate = useNavigate();
  const { currentTrip, tripMembers, tripBills, memberMap } = useCurrentTrip();
  const { addBill, deleteBill } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [form, setForm] = useState<{
    category: BillCategory;
    amount: string;
    payerId: string;
    splitType: SplitType;
    note: string;
    date: string;
    participantIds: string[];
    ratios: Record<string, string>;
    fixedAmounts: Record<string, string>;
  }>({
    category: 'food',
    amount: '',
    payerId: '',
    splitType: 'equal',
    note: '',
    date: todayStr(),
    participantIds: [],
    ratios: {},
    fixedAmounts: {},
  });

  const groupedBills = useMemo(() => {
    const filtered = dateFilter ? tripBills.filter((b) => b.date === dateFilter) : tripBills;
    const groups: Record<string, typeof tripBills> = {};
    filtered.forEach((bill) => {
      if (!groups[bill.date]) groups[bill.date] = [];
      groups[bill.date].push(bill);
    });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return dates.map((date) => ({ date, bills: groups[date] }));
  }, [tripBills, dateFilter]);

  const totalFiltered = useMemo(
    () => (dateFilter ? tripBills.filter((b) => b.date === dateFilter) : tripBills)
      .reduce((sum, b) => sum + b.amount, 0),
    [tripBills, dateFilter]
  );

  const allDates = useMemo(() => {
    const set = new Set(tripBills.map((b) => b.date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [tripBills]);

  const previewShares = useMemo(() => {
    if (!form.amount || form.participantIds.length === 0) return {};
    const participants: BillParticipant[] = form.participantIds.map((mid) => ({
      id: generateId(),
      billId: '',
      memberId: mid,
      ratio: Number(form.ratios[mid]) || 0,
      fixedAmount: Number(form.fixedAmounts[mid]) || 0,
    }));
    return calculateBillShares({
      id: '',
      tripId: '',
      category: form.category,
      amount: Number(form.amount) || 0,
      payerId: form.payerId,
      splitType: form.splitType,
      note: form.note,
      date: form.date,
      createdAt: '',
      participants,
    });
  }, [form]);

  const handleOpenModal = () => {
    if (tripMembers.length > 0) {
      setForm((f) => ({
        ...f,
        payerId: tripMembers[0].id,
        participantIds: tripMembers.map((m) => m.id),
        ratios: Object.fromEntries(tripMembers.map((m) => [m.id, ''])),
        fixedAmounts: Object.fromEntries(tripMembers.map((m) => [m.id, ''])),
      }));
    }
    setShowModal(true);
  };

  const toggleParticipant = (memberId: string) => {
    setForm((f) => {
      const exists = f.participantIds.includes(memberId);
      const newIds = exists
        ? f.participantIds.filter((id) => id !== memberId)
        : [...f.participantIds, memberId];
      return { ...f, participantIds: newIds };
    });
  };

  const handleAddBill = () => {
    if (!currentTrip || !form.amount || !form.payerId || form.participantIds.length === 0) return;
    const amount = Number(form.amount);
    const participants: BillParticipant[] = form.participantIds.map((mid) => {
      let ratio = 0;
      let fixedAmount = 0;
      if (form.splitType === 'equal') {
        ratio = 1 / form.participantIds.length;
      } else if (form.splitType === 'ratio') {
        ratio = Number(form.ratios[mid]) || 0;
      } else {
        fixedAmount = Number(form.fixedAmounts[mid]) || 0;
      }
      return {
        id: generateId(),
        billId: '',
        memberId: mid,
        ratio: round2(ratio),
        fixedAmount: round2(fixedAmount),
      };
    });

    addBill({
      tripId: currentTrip.id,
      category: form.category,
      amount,
      payerId: form.payerId,
      splitType: form.splitType,
      note: form.note.trim(),
      date: form.date,
      participants,
    });
    setForm({
      category: 'food',
      amount: '',
      payerId: tripMembers[0]?.id || '',
      splitType: 'equal',
      note: '',
      date: todayStr(),
      participantIds: tripMembers.map((m) => m.id),
      ratios: {},
      fixedAmounts: {},
    });
    setShowModal(false);
  };

  if (!currentTrip) {
    return (
      <PageLayout title="账单记录">
        <EmptyState
          icon={<Receipt className="w-10 h-10" />}
          title="请先选择一个旅行"
          description="在行程页面创建或选择一个旅行后，才能记录账单"
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
        title="账单记录"
        rightAction={
          <button
            onClick={handleOpenModal}
            disabled={tripMembers.length === 0}
            className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
        headerExtra={
          allDates.length > 0 && (
            <div className="px-4 pb-3 overflow-x-auto no-scrollbar">
              <div className="flex gap-2">
                <button
                  onClick={() => setDateFilter('')}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                    dateFilter === ''
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  全部
                </button>
                {allDates.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDateFilter(d)}
                    className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                      dateFilter === d
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {formatDateCN(d)}
                  </button>
                ))}
              </div>
            </div>
          )
        }
      >
        {tripBills.length > 0 && (
          <div className="mb-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {dateFilter ? '筛选日期总消费' : '旅行总消费'}
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  {formatMoney(totalFiltered)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">账单笔数</div>
                <div className="text-2xl font-bold text-primary-600">
                  {groupedBills.reduce((s, g) => s + g.bills.length, 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {tripBills.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-10 h-10" />}
            title="还没有账单"
            description={
              tripMembers.length === 0
                ? '请先添加成员，然后才能记录账单'
                : '点击右上角按钮记录第一笔消费'
            }
            action={
              tripMembers.length === 0 ? (
                <button
                  onClick={() => navigate('/members')}
                  className="px-6 py-3 bg-primary-500 text-white rounded-full font-medium shadow-lg shadow-primary-500/30 active:scale-95 transition-all flex items-center gap-2"
                >
                  去添加成员
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleOpenModal}
                  className="px-6 py-3 bg-primary-500 text-white rounded-full font-medium shadow-lg shadow-primary-500/30 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  记一笔
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-5">
            {groupedBills.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">
                    {formatDateCN(group.date)}
                  </span>
                  <span className="ml-auto text-sm text-gray-500">
                    {formatMoney(group.bills.reduce((s, b) => s + b.amount, 0))}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.bills.map((bill) => {
                    const payer = memberMap[bill.payerId];
                    const shares = calculateBillShares(bill);
                    return (
                      <div
                        key={bill.id}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                      >
                        <div className="flex items-start gap-3">
                          <CategoryIcon category={bill.category} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800">
                                  {bill.note || CATEGORY_CONFIG[bill.category].label}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {payer && (
                                    <MemberAvatar name={payer.name} color={payer.color} size="sm" />
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {payer?.name} 支付
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <div className="text-lg font-bold text-gray-800">
                                  {formatMoney(bill.amount)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {SPLIT_TYPE_CONFIG[bill.splitType].label}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-2">
                              {bill.participants.map((p) => {
                                const m = memberMap[p.memberId];
                                if (!m) return null;
                                return (
                                  <div
                                    key={p.id}
                                    className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs"
                                  >
                                    <MemberAvatar name={m.name} color={m.color} size="sm" />
                                    <span className="text-gray-600">{m.name}</span>
                                    <span className="text-gray-800 font-medium">
                                      {formatMoney(shares[m.id] || 0)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm('确定删除这笔账单吗？')) {
                                deleteBill(bill.id);
                              }
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageLayout>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="记一笔">
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">消费分类</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(CATEGORY_CONFIG) as BillCategory[]).map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const Icon = cfg.icon;
                const active = form.category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${
                      active
                        ? cfg.bgColor + ' ring-2 ring-offset-1 ring-current ' + cfg.color
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? cfg.color : 'text-gray-500'}`} />
                    <span className={`text-xs ${active ? cfg.color + ' font-medium' : 'text-gray-500'}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              金额（元） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800 text-2xl font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">消费日期</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备注（可选）</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="简单描述一下这笔消费"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              付款人 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {tripMembers.map((m) => {
                const active = form.payerId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setForm({ ...form, payerId: m.id })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                      active
                        ? 'bg-primary-50 ring-2 ring-primary-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <MemberAvatar name={m.name} color={m.color} size="sm" />
                    <span className={`text-sm ${active ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
                      {m.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分摊方式</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SPLIT_TYPE_CONFIG) as SplitType[]).map((type) => {
                const cfg = SPLIT_TYPE_CONFIG[type];
                const active = form.splitType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setForm({ ...form, splitType: type })}
                    className={`py-2.5 rounded-xl transition-all text-center ${
                      active
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`text-sm font-medium ${active ? '' : ''}`}>{cfg.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              参与人 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {tripMembers.map((m) => {
                const checked = form.participantIds.includes(m.id);
                return (
                  <div key={m.id}>
                    <button
                      onClick={() => toggleParticipant(m.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        checked ? 'bg-primary-50' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          checked ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <MemberAvatar name={m.name} color={m.color} size="sm" />
                      <span className="text-sm font-medium text-gray-700 flex-1 text-left">
                        {m.name}
                      </span>
                      {checked && (
                        <span className="text-sm font-medium text-primary-600">
                          {previewShares[m.id] !== undefined
                            ? formatMoney(previewShares[m.id])
                            : ''}
                        </span>
                      )}
                    </button>
                    {checked && form.splitType === 'ratio' && (
                      <div className="mt-2 ml-10 flex items-center gap-2">
                        <span className="text-xs text-gray-500">比例</span>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={form.ratios[m.id]}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              ratios: { ...form.ratios, [m.id]: e.target.value },
                            })
                          }
                          placeholder="0.5"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary-500"
                        />
                      </div>
                    )}
                    {checked && form.splitType === 'fixed' && (
                      <div className="mt-2 ml-10 flex items-center gap-2">
                        <span className="text-xs text-gray-500">金额</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.fixedAmounts[m.id]}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              fixedAmounts: { ...form.fixedAmounts, [m.id]: e.target.value },
                            })
                          }
                          placeholder="0.00"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddBill}
              disabled={!form.amount || !form.payerId || form.participantIds.length === 0}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
