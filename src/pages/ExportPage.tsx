import { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Download, Upload, ArrowRight, FileDown, FileUp, Check, AlertCircle, Calendar, Receipt, ArrowLeftRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useStore } from '@/store/useStore';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import { CATEGORY_CONFIG, SPLIT_TYPE_CONFIG } from '@/constants';
import { exportJSON, importJSON } from '@/utils/export';
import { formatMoney, formatDateCN, todayStr } from '@/utils/id';
import { calculateBillShares } from '@/utils/calculation';
import type { Bill } from '@/types';

type ExportScope = 'all' | 'range' | 'settlement';

export default function ExportPage() {
  const navigate = useNavigate();
  const { currentTrip, tripMembers, tripBills, memberMap, totalExpense, transfers } = useCurrentTrip();
  const { trips, currentTripId, members, bills, advancePayments, settlements, importData } = useStore();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const budgetPerPerson = currentTrip?.budgetPerPerson || 0;
  const totalBudget = budgetPerPerson * tripMembers.length;
  const overspent = totalBudget > 0 && totalExpense > totalBudget;
  const remaining = totalBudget - totalExpense;
  const progress = totalBudget > 0 ? Math.min((totalExpense / totalBudget) * 100, 100) : 0;

  const filteredBillsForExport = useMemo(() => {
    let result = tripBills;
    if (exportScope === 'range' && rangeStart && rangeEnd) {
      result = result.filter((b) => b.date >= rangeStart && b.date <= rangeEnd);
    }
    return result;
  }, [tripBills, exportScope, rangeStart, rangeEnd]);

  const filteredTotal = useMemo(
    () => filteredBillsForExport.reduce((s, b) => s + b.amount, 0),
    [filteredBillsForExport]
  );

  const groupedBills = useMemo(() => {
    const groups: Record<string, Bill[]> = {};
    filteredBillsForExport.forEach((bill) => {
      if (!groups[bill.date]) groups[bill.date] = [];
      groups[bill.date].push(bill);
    });
    const dates = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return dates.map((date) => ({ date, bills: groups[date] }));
  }, [filteredBillsForExport]);

  const canExport = useMemo(() => {
    if (exportScope === 'settlement') return transfers.length > 0 || true;
    if (exportScope === 'range') return filteredBillsForExport.length > 0 && rangeStart && rangeEnd;
    return filteredBillsForExport.length > 0;
  }, [exportScope, filteredBillsForExport, rangeStart, rangeEnd, transfers]);

  const handleExportImage = async () => {
    if (!exportRef.current) return;
    if (!canExport) {
      if (exportScope === 'range' && (!rangeStart || !rangeEnd)) {
        alert('请选择日期范围');
        return;
      }
      if (filteredBillsForExport.length === 0 && exportScope !== 'settlement') {
        alert('所选范围内没有账单可导出');
        return;
      }
    }
    setExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const suffix =
        exportScope === 'settlement'
          ? '_结算方案'
          : exportScope === 'range'
          ? `_${rangeStart}_至_${rangeEnd}`
          : '';
      a.download = `${currentTrip?.name || '旅行账单'}${suffix}_消费清单.png`;
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

  const handleExportJSON = () => {
    const data = { trips, currentTripId, members, bills, advancePayments, settlements };
    exportJSON(data, `旅行AA记账_备份_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportSuccess(false);
    try {
      const data = (await importJSON(file)) as Parameters<typeof importData>[0];
      importData(data);
      setImportSuccess(true);
    } catch (err) {
      setImportError('文件格式错误，无法导入');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!currentTrip) {
    return (
      <PageLayout title="数据导出">
        <EmptyState
          icon={<Download className="w-10 h-10" />}
          title="请先选择一个旅行"
          description="在行程页面创建或选择一个旅行后，才能导出数据"
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
        <div className="mt-6">
          <button
            onClick={handleImportClick}
            className="w-full py-4 bg-white rounded-2xl border border-gray-200 hover:border-primary-300 transition-colors flex items-center justify-center gap-2 text-gray-600 font-medium"
          >
            <FileUp className="w-5 h-5" />
            导入备份数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          {importSuccess && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-emerald-700">导入成功！数据已恢复</span>
            </div>
          )}
          {importError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-600">{importError}</span>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout title="数据导出">
        <div className="space-y-4">
          <div
            onClick={() => setShowOptions(true)}
            className="w-full p-5 bg-gradient-to-br from-primary-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Image className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">导出消费清单图片</div>
                <div className="text-sm text-primary-100 mt-0.5">
                  {exporting
                    ? '正在生成图片...'
                    : exportScope === 'all'
                    ? '导出全部账单（含预算、结算）'
                    : exportScope === 'range'
                    ? `日期范围：${rangeStart || '开始'} 至 ${rangeEnd || '结束'}`
                    : '仅导出结算方案'}
                </div>
              </div>
              <FileDown className="w-5 h-5" />
            </div>
          </div>

          {showOptions && (
            <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="font-semibold text-gray-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary-500" />
                选择导出范围
              </div>

              <div className="space-y-2">
                {[
                  {
                    value: 'all' as ExportScope,
                    label: '全部账单 + 预算 + 结算',
                    desc: '包含所有消费记录、预算使用情况、转账方案',
                    icon: Receipt,
                  },
                  {
                    value: 'range' as ExportScope,
                    label: '指定日期范围',
                    desc: '只导出某个时间段内的账单',
                    icon: Calendar,
                  },
                  {
                    value: 'settlement' as ExportScope,
                    label: '仅结算方案',
                    desc: '只包含各成员收支和转账方案，方便群里对账',
                    icon: ArrowLeftRight,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = exportScope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setExportScope(opt.value)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                        active
                          ? 'bg-primary-50 ring-2 ring-primary-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          active ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${active ? 'text-primary-700' : 'text-gray-800'}`}>
                          {opt.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                      </div>
                      <Icon className={`w-4 h-4 mt-1 ${active ? 'text-primary-500' : 'text-gray-400'}`} />
                    </button>
                  );
                })}
              </div>

              {exportScope === 'range' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={rangeStart}
                      max={todayStr()}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      max={todayStr()}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setShowOptions(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleExportImage}
                  disabled={exporting || !canExport}
                  className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
                >
                  <Image className="w-4 h-4" />
                  {exporting ? '生成中...' : '生成图片'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleExportJSON}
            className="w-full p-5 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Download className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-lg">导出数据备份</div>
                <div className="text-sm text-gray-500 mt-0.5">导出JSON文件，可用于恢复数据</div>
              </div>
              <FileDown className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          <button
            onClick={handleImportClick}
            className="w-full p-5 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Upload className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-lg">导入备份数据</div>
                <div className="text-sm text-gray-500 mt-0.5">选择JSON文件恢复数据</div>
              </div>
              <FileUp className="w-5 h-5 text-gray-400" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          {importSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-emerald-700">导入成功！数据已恢复</span>
            </div>
          )}
          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-600">{importError}</span>
            </div>
          )}
        </div>
      </PageLayout>

      <div className="fixed left-full top-0" style={{ width: 380 }}>
        <div
          ref={exportRef}
          className="bg-white p-6"
          style={{ width: 380, fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}
        >
          <div className="text-center mb-5">
            <h1 className="text-xl font-bold text-gray-900">
              {currentTrip.name} · {exportScope === 'settlement' ? '结算方案' : '消费清单'}
            </h1>
            {currentTrip.destination && (
              <div className="text-sm text-gray-500 mt-1">📍 {currentTrip.destination}</div>
            )}
            {exportScope === 'range' && rangeStart && rangeEnd && (
              <div className="text-xs text-gray-400 mt-1">
                {rangeStart} 至 {rangeEnd}
              </div>
            )}
            <div className="mt-4 inline-block">
              <div className="text-xs text-gray-400">
                {exportScope === 'settlement' ? '待结算总额' : '消费总额'}
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {formatMoney(exportScope === 'all' ? totalExpense : filteredTotal)}
              </div>
            </div>
          </div>

          {exportScope !== 'settlement' && totalBudget > 0 && (
            <div className="mb-5 p-4 rounded-2xl border-2 border-gray-100">
              <div className="text-sm font-semibold text-gray-700 mb-3">📊 预算使用情况</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  人均预算 {formatMoney(budgetPerPerson)} × {tripMembers.length}人
                </span>
                <span
                  className={`text-xs font-semibold ${
                    overspent ? 'text-red-500' : 'text-emerald-600'
                  }`}
                >
                  {progress.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    overspent ? 'bg-red-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">
                  总预算: <span className="text-gray-700 font-medium">{formatMoney(totalBudget)}</span>
                </span>
                <span className={overspent ? 'text-red-500' : 'text-emerald-600'}>
                  {overspent ? '已超支' : '剩余'}:{' '}
                  <span className="font-semibold">{formatMoney(Math.abs(remaining))}</span>
                </span>
              </div>
            </div>
          )}

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

          {exportScope !== 'settlement' && groupedBills.length > 0 && (
            <div className="mb-2 text-sm font-semibold text-gray-700">📋 消费明细</div>
          )}

          {exportScope !== 'settlement' &&
            groupedBills.map((group) => (
              <div key={group.date} className="mb-5">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">
                    {formatDateCN(group.date)}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {formatMoney(group.bills.reduce((s, b) => s + b.amount, 0))}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.bills.map((bill) => {
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
            ))}

          {(exportScope === 'all' || exportScope === 'settlement') && (
            <div className="pt-3 border-t-2 border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-3">💰 结算方案（谁该付谁）</div>
              {transfers.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  ✅ 已全部结清，无需转账
                </div>
              ) : (
                <div className="space-y-2">
                  {transfers.map((t, i) => {
                    const from = memberMap[t.fromMemberId];
                    const to = memberMap[t.toMemberId];
                    return (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold shrink-0"
                            style={{ backgroundColor: from?.color }}
                          >
                            {from?.name.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{from?.name}</span>
                        </div>
                        <span className="text-sm font-bold text-primary-600 px-2">
                          → {formatMoney(t.amount)} →
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 font-medium">{to?.name}</span>
                          <div
                            className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold shrink-0"
                            style={{ backgroundColor: to?.color }}
                          >
                            {to?.name.charAt(0)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            由旅行AA记账生成 · {new Date().toLocaleDateString('zh-CN')}
          </div>
        </div>
      </div>
    </>
  );
}
