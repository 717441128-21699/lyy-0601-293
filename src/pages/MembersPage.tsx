import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserPlus, Trash2, Wallet, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import PageLayout from '@/components/PageLayout';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import MemberAvatar from '@/components/MemberAvatar';
import { MEMBER_COLORS } from '@/constants';
import { formatMoney } from '@/utils/id';

export default function MembersPage() {
  const navigate = useNavigate();
  const { currentTrip, tripMembers, memberBalances, memberMap } = useCurrentTrip();
  const { addMember, deleteMember, addAdvancePayment } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState(MEMBER_COLORS[0]);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');

  const balanceMap = useMemo(() => {
    const map: Record<string, typeof memberBalances[number]> = {};
    memberBalances.forEach((b) => {
      map[b.memberId] = b;
    });
    return map;
  }, [memberBalances]);

  const handleAddMember = () => {
    if (!newMemberName.trim() || !currentTrip) return;
    addMember({
      tripId: currentTrip.id,
      name: newMemberName.trim(),
      color: newMemberColor,
    });
    setNewMemberName('');
    setNewMemberColor(MEMBER_COLORS[(tripMembers.length + 1) % MEMBER_COLORS.length]);
    setShowAddModal(false);
  };

  const handleAddAdvance = () => {
    if (!selectedMemberId || !currentTrip || !advanceAmount) return;
    addAdvancePayment({
      tripId: currentTrip.id,
      memberId: selectedMemberId,
      amount: Number(advanceAmount),
      note: advanceNote.trim(),
    });
    setAdvanceAmount('');
    setAdvanceNote('');
    setSelectedMemberId(null);
    setShowAdvanceModal(false);
  };

  if (!currentTrip) {
    return (
      <PageLayout title="成员管理">
        <EmptyState
          icon={<UserPlus className="w-10 h-10" />}
          title="请先选择一个旅行"
          description="在行程页面创建或选择一个旅行后，才能管理成员"
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
        title="成员管理"
        rightAction={
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      >
        <div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-emerald-50 rounded-xl">
          <div className="text-sm text-gray-600">当前旅行</div>
          <div className="text-lg font-semibold text-gray-800">{currentTrip.name}</div>
        </div>

        {tripMembers.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="w-10 h-10" />}
            title="还没有成员"
            description="添加同行的伙伴，才能开始记录账单和分摊费用"
            action={
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-primary-500 text-white rounded-full font-medium shadow-lg shadow-primary-500/30 active:scale-95 transition-all flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                添加成员
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {tripMembers.map((member) => {
              const balance = balanceMap[member.id];
              return (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <MemberAvatar name={member.name} color={member.color} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-base">{member.name}</div>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="text-gray-500">
                          已付: <span className="text-gray-700 font-medium">{formatMoney(balance?.paid || 0)}</span>
                        </span>
                        <span className="text-gray-500">
                          应付: <span className="text-gray-700 font-medium">{formatMoney(balance?.shouldPay || 0)}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`确定删除成员「${member.name}」吗？`)) {
                          deleteMember(member.id);
                        }
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">预付款: </span>
                        <span className="text-amber-600 font-semibold">{formatMoney(balance?.advance || 0)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMemberId(member.id);
                        setShowAdvanceModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-full hover:bg-amber-100 transition-colors"
                    >
                      登记预付款
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                    <span className="text-sm text-gray-600">净余额</span>
                    <span
                      className={`text-lg font-bold ${
                        (balance?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {(balance?.balance || 0) >= 0 ? '+' : ''}
                      {formatMoney(balance?.balance || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageLayout>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="添加成员">
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="输入成员姓名"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">头像颜色</label>
            <div className="flex flex-wrap gap-2">
              {MEMBER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewMemberColor(color)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    newMemberColor === color
                      ? 'ring-2 ring-offset-2 ring-gray-800 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddMember}
              disabled={!newMemberName.trim()}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
            >
              添加
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} title="登记预付款">
        <div className="p-5 space-y-5">
          {selectedMemberId && memberMap[selectedMemberId] && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <MemberAvatar
                name={memberMap[selectedMemberId].name}
                color={memberMap[selectedMemberId].color}
              />
              <div>
                <div className="font-medium text-gray-800">{memberMap[selectedMemberId].name}</div>
                <div className="text-xs text-gray-500">为公共费用预付款</div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              金额（元） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              placeholder="输入预付金额"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800 text-lg font-semibold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备注（可选）</label>
            <input
              type="text"
              value={advanceNote}
              onChange={(e) => setAdvanceNote(e.target.value)}
              placeholder="如：酒店定金、租车费等"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800"
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setShowAdvanceModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium active:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddAdvance}
              disabled={!advanceAmount}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-medium shadow-lg shadow-amber-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
            >
              确认
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
