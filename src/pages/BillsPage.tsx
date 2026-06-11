import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Receipt,
  Trash2,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Edit3,
  AlertCircle,
  CheckSquare,
  Square,
  Undo2,
  Tag,
  X,
  Image as ImageIcon,
  Download,
  Filter,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useStore } from '@/store/useStore';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import CategoryIcon from '@/components/CategoryIcon';
import MemberAvatar from '@/components/MemberAvatar';
import { Bill, BillCategory, SplitType, BillParticipant } from '@/types';
import { CATEGORY_CONFIG, SPLIT_TYPE_CONFIG } from '@/constants';
import { formatMoney, formatDateCN, todayStr, generateId, round2 } from '@/utils/id';
import { calculateBillShares, validateSplit } from '@/utils/calculation';

interface FormState {
  category: BillCategory;
  amount: string;
  payerId: string;
  splitType: SplitType;
  note: string;
  date: string;
  participantIds: string[];
  weights: Record<string, string>;
  fixedAmounts: Record<string, string>;
}

const emptyForm: FormState = {
  category: 'food',
  amount: '',
  payerId: '',
  splitType: 'equal',
  note: '',
  date: todayStr(),
  participantIds: [],
  weights: {},
  fixedAmounts: {},
};

export default function BillsPage() {
  const navigate = useNavigate();
  const { currentTrip, tripMembers, tripBills, memberMap } = useCurrentTrip();
  const { addBill, updateBill, deleteBill, deleteBills, updateBillsCategory, undoLastDelete } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [validationError, setValidationError] = useState<string>('');

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCategory, setBatchCategory] = useState<BillCategory>('food');
  const [undoToast, setUndoToast] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<BillCategory | ''>('');
  const [exporting, setExporting] = useState(false);
  const batchExportRef = useRef<HTMLDivElement>(null);

  const filteredBills = useMemo(() => {
    let result = tripBills;
    if (dateFilter) result = result.filter((b) => b.date === dateFilter);
    if (categoryFilter) result = result.filter((b) => b.category === categoryFilter);
    return result;
  }, [tripBills, dateFilter, categoryFilter]);

  const groupedBills = useMemo(() => {
    const groups: Record<string, Bill[]> = {};
    filteredBills.forEach((bill) => {
      if (!groups[bill.date]) groups[bill.date] = [];
      groups[bill.date].push(bill);
    });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return dates.map((date) => ({ date, bills: groups[date] }));
  }, [filteredBills]);

  const totalFiltered = useMemo(
    () => filteredBills.reduce((sum, b) => sum + b.amount, 0),
    [filteredBills]
  );

  const allDates = useMemo(() => {
    const set = new Set(tripBills.map((b) => b.date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [tripBills]);

  const allCategories = useMemo(() => {
    const set = new Set(tripBills.map((b) => b.category));
    return Array.from(set);
  }, [tripBills]);

  const previewShares = useMemo(() => {
    if (!form.amount || form.participantIds.length === 0) return {};
    const participants: BillParticipant[] = form.participantIds.map((mid) => ({
      id: generateId(),
      billId: '',
      memberId: mid,
      ratio: Number(form.weights[mid]) || 0,
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

  useEffect(() => {
    if (!showModal) return;
    if (!form.amount || form.participantIds.length === 0) {
      setValidationError('');
      return;
    }
    const amount = round2(Number(form.amount));
    const participantsForValidation = form.participantIds.map((mid) => ({
      memberId: mid,
      ratio: Number(form.weights[mid]) || 0,
      fixedAmount: Number(form.fixedAmounts[mid]) || 0,
      weight: Number(form.weights[mid]) || 0,
    }));
    const validation = validateSplit(form.splitType, amount, participantsForValidation);
    if (!validation.valid) {
      setValidationError(validation.message || '分摊金额校验失败');
    } else {
      setValidationError('');
    }
  }, [form.amount, form.splitType, form.fixedAmounts, form.weights, form.participantIds, showModal]);

  const selectedBills = useMemo(
    () => tripBills.filter((b) => selectedIds.has(b.id)),
    [tripBills, selectedIds]
  );
  const selectedTotal = selectedBills.reduce((s, b) => s + b.amount, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectDate = (date: string) => {
    const dateBillIds = filteredBills.filter((b) => b.date === date).map((b) => b.id);
    const allSelected = dateBillIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        dateBillIds.forEach((id) => next.delete(id));
      } else {
        dateBillIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBills.length && filteredBills.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBills.map((b) => b.id)));
    }
  };

  const toggleSelectCategory = (cat: BillCategory) => {
    const catBillIds = filteredBills.filter((b) => b.category === cat).map((b) => b.id);
    const allSelected = catBillIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        catBillIds.forEach((id) => next.delete(id));
      } else {
        catBillIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 笔账单吗？`)) return;
    deleteBills(Array.from(selectedIds));
    setUndoCount(selectedIds.size);
    setUndoToast(true);
    setTimeout(() => setUndoToast(false), 3500);
    exitSelectMode();
  };

  const handleBatchChangeCategory = () => {
    if (selectedIds.size === 0) return;
    updateBillsCategory(Array.from(selectedIds), batchCategory);
    setShowBatchModal(false);
    exitSelectMode();
  };

  const handleUndo = () => {
    const ok = undoLastDelete();
    if (ok) {
      setUndoToast(false);
    }
  };

  const handleBatchExport = async () => {
    if (selectedIds.size === 0 || !batchExportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(batchExportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTrip?.name || '旅行'}_选中${selectedIds.size}笔账单.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBill(null);
    const defaultForm: FormState = { ...emptyForm, date: todayStr() };
    if (tripMembers.length > 0) {
      defaultForm.payerId = tripMembers[0].id;
      defaultForm.participantIds = tripMembers.map((m) => m.id);
      defaultForm.weights = Object.fromEntries(tripMembers.map((m) => [m.id, '1']));
      defaultForm.fixedAmounts = Object.fromEntries(tripMembers.map((m) => [m.id, '']));
    }
    setForm(defaultForm);
    setValidationError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (bill: Bill) => {
    setEditingBill(bill);
    const weights: Record<string, string> = {};
    const fixedAmounts: Record<string, string> = {};
    tripMembers.forEach((m) => {
      weights[m.id] = '';
      fixedAmounts[m.id] = '';
    });
    bill.participants.forEach((p) => {
      weights[p.memberId] = p.ratio > 0 ? String(p.ratio) : '1';
      fixedAmounts[p.memberId] = p.fixedAmount > 0 ? String(p.fixedAmount) : '';
    });
    setForm({
      category: bill.category,
      amount: String(bill.amount),
      payerId: bill.payerId,
      splitType: bill.splitType,
      note: bill.note,
      date: bill.date,
      participantIds: bill.participants.map((p) => p.memberId),
      weights,
      fixedAmounts,
    });
    setValidationError('');
    setShowModal(true);
  };

  const toggleParticipant = (memberId: string) => {
    setForm((f) => {
      const exists = f.participantIds.includes(memberId);
      const newIds = exists
        ? f.participantIds.filter((id) => id !== memberId)
        : [...f.participantIds, memberId];
      const newWeights = { ...f.weights };
      const newFixed = { ...f.fixedAmounts };
      if (!exists) {
        if (!newWeights[memberId]) newWeights[memberId] = '1';
      }
      return { ...f, participantIds: newIds, weights: newWeights, fixedAmounts: newFixed };
    });
  };

  const handleSaveBill = () => {
    if (!currentTrip || !form.amount || !form.payerId || form.participantIds.length === 0) return;
    const amount = round2(Number(form.amount));

    const participantsForValidation = form.participantIds.map((mid) => ({
      memberId: mid,
      ratio: Number(form.weights[mid]) || 0,
      fixedAmount: Number(form.fixedAmounts[mid]) || 0,
      weight: Number(form.weights[mid]) || 0,
    }));

    const validation = validateSplit(form.splitType, amount, participantsForValidation);
    if (!validation.valid) {
      setValidationError(validation.message || '分摊金额校验失败');
      return;
    }
    setValidationError('');

    const participants: BillParticipant[] = form.participantIds.map((mid) => {
      let ratio = 0;
      let fixedAmount = 0;
      if (form.splitType === 'equal') {
        ratio = 1 / form.participantIds.length;
      } else if (form.splitType === 'ratio') {
        ratio = Number(form.weights[mid]) || 1;
      } else {
        fixedAmount = Number(form.fixedAmounts[mid]) || 0;
      }
      return {
        id: editingBill
          ? editingBill.participants.find((p) => p.memberId === mid)?.id || generateId()
          : generateId(),
        billId: editingBill?.id || '',
        memberId: mid,
        ratio: round2(ratio),
        fixedAmount: round2(fixedAmount),
      };
    });

    if (editingBill) {
      updateBill(editingBill.id, {
        category: form.category,
        amount,
        payerId: form.payerId,
        splitType: form.splitType,
        note: form.note.trim(),
        date: form.date,
        participants,
      });
    } else {
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
    }

    setShowModal(false);
    setEditingBill(null);
    setForm(emptyForm);
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
        title={selectMode ? `已选 ${selectedIds.size} 笔` : '账单记录'}
        rightAction={
          selectMode ? (
            <button
              onClick={exitSelectMode}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleOpenAddModal}
              disabled={tripMembers.length === 0}
              className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
            >
              <Plus className="w-5 h-5" />
            </button>
          )
        }
        leftAction={
          tripBills.length > 0 && !selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center active:scale-95 transition-transform"
            >
              <CheckSquare className="w-5 h-5" />
            </button>
          ) : undefined
        }
        headerExtra={
          <>
            {allDates.length > 0 && (
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
            )}
            {selectMode && filteredBills.length > 0 && (
              <div className="px-4 pb-3 space-y-2 bg-white/80 backdrop-blur">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                  <button
                    onClick={() => setCategoryFilter('')}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                      categoryFilter === ''
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    全部分类
                  </button>
                  {allCategories.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const active = categoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                          active
                            ? cfg.bgColor + ' ' + cfg.color
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                      selectedIds.size === filteredBills.length && filteredBills.length > 0
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {selectedIds.size === filteredBills.length && filteredBills.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    全选
                  </button>
                  {allCategories.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const catBills = filteredBills.filter((b) => b.category === cat);
                    if (catBills.length === 0) return null;
                    const allCatSelected = catBills.every((b) => selectedIds.has(b.id));
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleSelectCategory(cat)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs transition-all ${
                          allCatSelected
                            ? cfg.bgColor + ' ' + cfg.color
                            : 'bg-gray-50 text-gray-500'
                        }`}
                      >
                        选{cfg.label}
                      </button>
                    );
                  })}
                  <div className="text-sm text-gray-500 flex-1 text-right">
                    合计 <span className="font-bold text-gray-800">{formatMoney(selectedTotal)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBatchModal(true)}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm bg-primary-50 text-primary-600 disabled:opacity-50"
                  >
                    <Tag className="w-4 h-4" />
                    改分类
                  </button>
                  <button
                    onClick={handleBatchExport}
                    disabled={selectedIds.size === 0 || exporting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm bg-blue-50 text-blue-600 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {exporting ? '导出中...' : '导出图片'}
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm bg-red-50 text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </div>
            )}
          </>
        }
      >
        {undoToast && (
          <div className="mb-4 p-3 bg-gray-900 text-white rounded-xl shadow-lg flex items-center gap-3 animate-slide-up">
            <div className="flex-1 text-sm">
              已删除 {undoCount} 笔账单
            </div>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-500 text-white text-sm font-medium active:scale-95 transition-all"
            >
              <Undo2 className="w-4 h-4" />
              撤回
            </button>
          </div>
        )}

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
                  onClick={handleOpenAddModal}
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
            {groupedBills.map((group) => {
              const allSelected = group.bills.every((b) => selectedIds.has(b.id));
              return (
                <div key={group.date}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    {selectMode && (
                      <button
                        onClick={() => toggleSelectDate(group.date)}
                        className="p-0.5"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary-500" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )}
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
                      const selected = selectedIds.has(bill.id);
                      return (
                        <div
                          key={bill.id}
                          onClick={() => selectMode && toggleSelect(bill.id)}
                          className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                            selected
                              ? 'border-primary-400 ring-2 ring-primary-200'
                              : 'border-gray-100'
                          } ${selectMode ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            {selectMode && (
                              <div className="pt-0.5">
                                {selected ? (
                                  <CheckSquare className="w-5 h-5 text-primary-500" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-300" />
                                )}
                              </div>
                            )}
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
                              {!selectMode && (
                                <div className="mt-3 pt-2 border-t border-gray-50 flex gap-2 justify-end">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(bill);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    编辑
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('确定删除这笔账单吗？')) {
                                        deleteBill(bill.id);
                                        setUndoCount(1);
                                        setUndoToast(true);
                                        setTimeout(() => setUndoToast(false), 3500);
                                      }
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    删除
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageLayout>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingBill ? '编辑账单' : '记一笔'}>
        <div className="p-5 space-y-4">
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
                    <div className="text-sm font-medium">{cfg.label}</div>
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
                        <span className="text-xs text-gray-500 w-10">权重</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={form.weights[m.id]}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              weights: { ...form.weights, [m.id]: e.target.value },
                            })
                          }
                          placeholder="1"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary-500"
                        />
                        <span className="text-xs text-gray-400">按占比分摊</span>
                      </div>
                    )}
                    {checked && form.splitType === 'fixed' && (
                      <div className="mt-2 ml-10 flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-10">金额</span>
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
                        <span className="text-xs text-gray-400">元</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {form.splitType === 'ratio' && form.participantIds.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
              💡 按权重分摊：例如3人分别填1、2、3，则按1/6、2/6、3/6的比例自动计算
            </div>
          )}

          {validationError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-sm text-red-600">{validationError}</span>
            </div>
          )}

          {form.amount && form.participantIds.length > 0 && (
            <div className={`p-3 rounded-xl ${validationError ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              <div className={`text-xs mb-1 ${validationError ? 'text-amber-600' : 'text-emerald-600'}`}>
                分摊预览（合计应等于账单金额）
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.participantIds.map((mid) => {
                  const m = memberMap[mid];
                  if (!m) return null;
                  return (
                    <span
                      key={mid}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        validationError ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100'
                      }`}
                    >
                      {m.name}: {formatMoney(previewShares[mid] || 0)}
                    </span>
                  );
                })}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    validationError ? 'text-amber-700 bg-amber-200' : 'text-emerald-700 bg-emerald-200'
                  }`}
                >
                  合计: {formatMoney(Object.values(previewShares).reduce((s, v) => s + v, 0))}
                </span>
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveBill}
              disabled={!form.amount || !form.payerId || form.participantIds.length === 0 || !!validationError}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
            >
              {editingBill ? '保存修改' : '保存'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showBatchModal} onClose={() => setShowBatchModal(false)} title="批量修改分类">
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600">
            已选择 <span className="font-bold text-gray-800">{selectedIds.size}</span> 笔账单，统一改为：
          </div>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(CATEGORY_CONFIG) as BillCategory[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const Icon = cfg.icon;
              const active = batchCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setBatchCategory(cat)}
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
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setShowBatchModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleBatchChangeCategory}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 active:scale-95 transition-all"
            >
              确认修改
            </button>
          </div>
        </div>
      </Modal>

      <div className="fixed left-full top-0" style={{ width: 380 }}>
        <div
          ref={batchExportRef}
          className="bg-white p-6"
          style={{ width: 380, fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}
        >
          <div className="text-center mb-5">
            <h1 className="text-xl font-bold text-gray-900">
              {currentTrip?.name || '旅行'} · 选中账单
            </h1>
            <div className="text-sm text-gray-500 mt-1">
              共 {selectedIds.size} 笔账单
            </div>
            <div className="mt-4 inline-block">
              <div className="text-xs text-gray-400">合计金额</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatMoney(selectedTotal)}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-5 flex-wrap justify-center">
            {tripMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                <div
                  className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                  style={{ backgroundColor: m.color }}
                >
                  {m.name.charAt(0)}
                </div>
                <span className="text-xs text-gray-700">{m.name}</span>
              </div>
            ))}
          </div>

          <div className="mb-2 text-sm font-semibold text-gray-700">📋 消费明细</div>
          {(() => {
            const groups: Record<string, Bill[]> = {};
            selectedBills.forEach((bill) => {
              if (!groups[bill.date]) groups[bill.date] = [];
              groups[bill.date].push(bill);
            });
            const dates = Object.keys(groups).sort((a, b) => a.localeCompare(b));
            return dates.map((date) => {
              const groupBills = groups[date];
              return (
                <div key={date} className="mb-5">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">
                      {formatDateCN(date)}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {formatMoney(groupBills.reduce((s, b) => s + b.amount, 0))}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {groupBills.map((bill) => {
                      const payer = memberMap[bill.payerId];
                      const shares = calculateBillShares(bill);
                      const cfg = CATEGORY_CONFIG[bill.category];
                      return (
                        <div key={bill.id} className="flex gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bgColor}`}
                          >
                            <span className="text-sm">{cfg.label.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="font-medium text-gray-800 text-sm">
                                {bill.note || cfg.label}
                              </div>
                              <div className="font-bold text-gray-900 text-sm ml-2 shrink-0">
                                {formatMoney(bill.amount)}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {payer?.name} 支付 · {SPLIT_TYPE_CONFIG[bill.splitType].label}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {bill.participants.map((p) => {
                                const m = memberMap[p.memberId];
                                if (!m) return null;
                                return (
                                  <span
                                    key={p.id}
                                    className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded"
                                  >
                                    {m.name} {formatMoney(shares[m.id] || 0)}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}

          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            由旅行AA记账生成 · {new Date().toLocaleDateString('zh-CN')}
          </div>
        </div>
      </div>
    </>
  );
}
