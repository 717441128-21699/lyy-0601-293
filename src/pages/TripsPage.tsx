import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar, Users, Trash2, ChevronRight, PlusCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { todayStr, formatDateShort, formatMoney } from '@/utils/id';

export default function TripsPage() {
  const navigate = useNavigate();
  const { trips, members, bills, currentTripId, setCurrentTrip, addTrip, deleteTrip } = useStore();
  const { totalExpense } = useCurrentTrip();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    destination: '',
    startDate: todayStr(),
    endDate: todayStr(),
    budgetPerPerson: 0,
  });

  const handleCreateTrip = () => {
    if (!form.name.trim()) return;
    addTrip({
      name: form.name.trim(),
      destination: form.destination.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      budgetPerPerson: Number(form.budgetPerPerson) || 0,
    });
    setShowModal(false);
    setForm({ name: '', destination: '', startDate: todayStr(), endDate: todayStr(), budgetPerPerson: 0 });
    navigate('/members');
  };

  const handleSelectTrip = (tripId: string) => {
    setCurrentTrip(tripId);
  };

  const getTripStats = (tripId: string) => {
    const memberCount = members.filter((m) => m.tripId === tripId).length;
    const tripBills = bills.filter((b) => b.tripId === tripId);
    const expense = tripBills.reduce((sum, b) => sum + b.amount, 0);
    return { memberCount, billCount: tripBills.length, expense };
  };

  return (
    <>
      <PageLayout
        title="我的行程"
        rightAction={
          <button
            onClick={() => setShowModal(true)}
            className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      >
        {trips.length === 0 ? (
          <EmptyState
            icon={<MapPin className="w-10 h-10" />}
            title="还没有旅行行程"
            description="点击右上角按钮创建你的第一个旅行，开始记录美好时光"
            action={
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-primary-500 text-white rounded-full font-medium shadow-lg shadow-primary-500/30 active:scale-95 transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                新建旅行
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => {
              const stats = getTripStats(trip.id);
              const isActive = trip.id === currentTripId;
              return (
                <div
                  key={trip.id}
                  onClick={() => handleSelectTrip(trip.id)}
                  className={`relative bg-white rounded-2xl p-5 shadow-sm border-2 transition-all cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? 'border-primary-500 shadow-lg shadow-primary-500/10'
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                      当前
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-800 mb-2 pr-12">{trip.name}</h3>
                  {trip.destination && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{trip.destination}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {formatDateShort(trip.startDate)} - {formatDateShort(trip.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{stats.memberCount}人</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {stats.billCount}笔账单
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">总消费</div>
                        <div className="text-lg font-bold text-gray-800">
                          {formatMoney(stats.expense)}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('确定要删除这个旅行吗？相关数据将无法恢复。')) {
                        deleteTrip(trip.id);
                      }
                    }}
                    className="absolute bottom-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {currentTripId && (
              <div className="pt-4">
                <div className="bg-gradient-to-br from-primary-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-primary-500/20">
                  <div className="text-sm text-primary-100 mb-1">当前旅行总消费</div>
                  <div className="text-3xl font-bold mb-3">{formatMoney(totalExpense)}</div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => navigate('/bills')}
                      className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-medium hover:bg-white/30 transition-colors"
                    >
                      查看账单
                    </button>
                    <button
                      onClick={() => navigate('/settlement')}
                      className="px-4 py-2 bg-white text-primary-600 rounded-full text-sm font-medium hover:bg-primary-50 transition-colors"
                    >
                      去结算
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </PageLayout>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="新建旅行">
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              旅行名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：三亚五日游"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">目的地</label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="如：海南三亚"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">人均预算（元）</label>
            <input
              type="number"
              min="0"
              value={form.budgetPerPerson || ''}
              onChange={(e) => setForm({ ...form, budgetPerPerson: Number(e.target.value) })}
              placeholder="可选，稍后可设置"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreateTrip}
              disabled={!form.name.trim()}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
            >
              创建
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
