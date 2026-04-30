import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { formatMoney } from '../utils/format';
import { showError, showSuccess } from '../utils/toast';
import { FAMILY_CHANGED_EVENT } from '../components/Layout';

export default function Family() {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [invites, setInvites] = useState([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [memberStats, setMemberStats] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, title: '', message: '' });
  const [promptModal, setPromptModal] = useState({ open: false, title: '', onSubmit: null });

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      setFamily(res.data.family);
      setInviteCode(res.data.family?.invite_code || '');
    } catch (err) { console.error('User fetch error:', err); }
  };

  const fetchMemberStats = async () => {
    try {
      const res = await api.get('/dashboard');
      if (res.data?.family?.memberStats) {
        setMemberStats(res.data.family.memberStats);
      }
    } catch (err) { console.error('Dashboard fetch error:', err); }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchUser(),
      fetchMemberStats(),
      fetchInvites(),
    ]);
    setLoading(false);
  };

  const fetchInvites = async () => {
    try { const res = await api.get('/auth/family/invites'); setInvites(res.data); }
    catch (err) { console.error(err); setInvites([]); }
  };

  const revokeInvite = async (invId) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Отозвать приглашение?',
      message: 'Приглашение будет удалено без возможности восстановления.',
      confirmText: 'Отозвать',
      onConfirm: async () => {
        try { await api.delete(`/auth/family/invites/${invId}`); fetchInvites(); }
        catch (err) { showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  const transferOwnership = async () => {
    if (!transferTarget) return;
    setConfirmModal({
      open: true,
      variant: 'warning',
      title: 'Передать владение?',
      message: `Передать владение семьей участнику ${transferTarget.name}?`,
      confirmText: 'Передать',
      onConfirm: async () => {
        try {
          await api.post('/auth/family/transfer-ownership', { newOwnerId: transferTarget.id });
          window.dispatchEvent(new Event(FAMILY_CHANGED_EVENT));
          setTransferModalOpen(false);
          setTransferTarget(null);
          fetchUser();
        } catch (err) {
          showError(err.response?.data?.message || 'Ошибка');
        }
      }
    });
  };

  useEffect(() => { fetchData(); }, []);

  const copyInviteCode = () => {
    if (inviteCode) { navigator.clipboard.writeText(inviteCode); showSuccess('Код приглашения скопирован'); }
  };

  const leaveFamily = async () => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Покинуть семью?',
      message: 'Вы уверены, что хотите покинуть семью?',
      confirmText: 'Покинуть',
      onConfirm: async () => {
        try { await api.post('/auth/family/leave'); window.dispatchEvent(new Event(FAMILY_CHANGED_EVENT)); fetchUser(); }
        catch (err) { showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  const removeMember = async (memberId, memberName) => {
    setConfirmModal({
      open: true,
      variant: 'danger',
      title: 'Удалить участника?',
      message: `Удалить ${memberName} из семьи?`,
      confirmText: 'Удалить',
      onConfirm: async () => {
        try { await api.delete(`/auth/family/members/${memberId}`); window.dispatchEvent(new Event(FAMILY_CHANGED_EVENT)); fetchUser(); }
        catch (err) { showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  const createFamily = () => {
    setPromptModal({
      open: true,
      title: 'Создать семью',
      placeholder: 'Название семьи',
      onSubmit: async (name) => {
        try { await api.post('/auth/family/create', { name }); window.dispatchEvent(new Event(FAMILY_CHANGED_EVENT)); fetchUser(); }
        catch (err) { showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  const joinFamily = () => {
    setPromptModal({
      open: true,
      title: 'Присоединиться к семье',
      placeholder: 'Код приглашения',
      onSubmit: async (code) => {
        try { await api.post('/auth/family/join', { inviteCode: code }); window.dispatchEvent(new Event(FAMILY_CHANGED_EVENT)); fetchUser(); }
        catch (err) { showError(err.response?.data?.message || 'Ошибка'); }
      }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  if (!user?.family_id) {
    return (
      <div className="space-y-8">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Семья</h2>
        </div>
        <div className="bg-surface-container-lowest p-12 rounded-3xl shadow-card text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-primary">groups</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Вы пока не состоите в семье</h3>
          <p className="text-on-surface-variant text-sm mb-8 max-w-md mx-auto">Создайте семью или присоединитесь по коду приглашения, чтобы управлять финансами вместе</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={createFamily} className="btn-primary px-8 py-3">
              <span className="material-symbols-outlined text-sm mr-1">add_circle</span>
              Создать семью
            </button>
            <button onClick={joinFamily} className="btn-ghost px-8 py-3">
              <span className="material-symbols-outlined text-sm mr-1">login</span>
              Присоединиться
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = family.owner_user_id === user.id;

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Назад
        </Link>
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Семья</h2>
        <p className="text-on-surface-variant text-sm mt-1">Управление семейным аккаунтом</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('members')} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${activeTab === 'members' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
          Участники
        </button>
        <button onClick={() => setActiveTab('finance')} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${activeTab === 'finance' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
          Финансы
        </button>
      </div>

      {/* Family Info Card */}
      <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary">groups</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-headline text-on-surface">{family.name}</h3>
            <p className="text-sm text-on-surface-variant">Код приглашения</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container rounded-2xl">
          <code className="text-lg font-mono font-bold text-on-surface flex-1">{inviteCode}</code>
          <button onClick={copyInviteCode} className="btn-ghost px-4 py-2 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">content_copy</span>
            Копировать
          </button>
        </div>
      </div>

      {activeTab === 'members' && (
        <>
          {/* Invitations (owner only) */}
          {isOwner && (
            <div className="bg-surface-container p-6 rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold font-headline">Приглашения</h3>
                  <p className="text-sm text-on-surface-variant">Временные коды для новых участников</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { try { await api.post('/auth/family/invites', { expiresInDays: 7 }); fetchInvites(); } catch (err) { showError(err.response?.data?.message || 'Ошибка'); } }} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Создать (7 дней)
                  </button>
                  <button onClick={fetchInvites} className="btn-ghost px-4 py-2.5 text-sm">Обновить</button>
                </div>
              </div>

              {invites.length > 0 ? (
                <div className="space-y-3">
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between gap-3 p-4 bg-surface-container-lowest rounded-2xl">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono font-bold text-on-surface">{inv.code}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Истекает: {inv.expires_at ? new Date(inv.expires_at).toLocaleString('ru-RU') : 'не истекает'}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { navigator.clipboard.writeText(inv.code); showSuccess('Код скопирован'); }} className="btn-ghost px-3 py-1.5 text-xs">Копировать</button>
                        <button onClick={() => revokeInvite(inv.id)} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-error bg-error-container hover:opacity-90 transition-colors">Отозвать</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant text-center py-4">Нет активных приглашений</p>
              )}
            </div>
          )}

          {/* Members */}
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-card">
            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">people</span>
              Участники ({family.members?.length || 0})
            </h3>
            <div className="space-y-3">
              {family.members?.map(member => {
                const isMemberOwner = member.id === family.owner_user_id;
                return (
                  <div key={member.id} className="flex justify-between items-center p-4 bg-surface-container rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {member.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <span className="font-semibold text-on-surface">{member.name}</span>
                        <span className="text-sm text-on-surface-variant ml-2">{member.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMemberOwner ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">workspace_premium</span>
                          Владелец
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-container-high text-on-surface-variant">Участник</span>
                      )}
                      {isOwner && !isMemberOwner && (
                        <button onClick={() => removeMember(member.id, member.name)} className="w-9 h-9 flex items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors" title="Удалить">
                          <span className="material-symbols-outlined text-sm">person_remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-surface-container p-6 rounded-3xl">
            <h3 className="text-lg font-bold font-headline mb-4">Действия</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={copyInviteCode} className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">person_add</span>
                Пригласить
              </button>
              {!isOwner && (
                <button onClick={leaveFamily} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-error bg-error-container hover:opacity-90 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Покинуть семью
                </button>
              )}
              {isOwner && family.members && family.members.length > 1 && (
                <button onClick={() => setTransferModalOpen(true)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-yellow-700 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 hover:opacity-90 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                  Передать владение
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-card">
            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">bar_chart</span>
              Финансовый обзор за месяц
            </h3>
            {memberStats.length > 0 ? (
              <div className="space-y-4">
                {memberStats.map((m, idx) => {
                  const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-error'];
                  const color = colors[idx % colors.length];
                  const incomePct = m.income + m.expenses > 0 ? Math.round(m.income / (m.income + m.expenses) * 100) : 50;
                  return (
                    <div key={m.userId} className="bg-surface-container p-4 rounded-2xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl ${color}/20 flex items-center justify-center ${color.replace('bg-', 'text-')} font-bold text-sm`}>
                          {m.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-on-surface">{m.name}</p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-secondary">+{formatMoney(m.income)}</span>
                            <span className="text-xs text-error">-{formatMoney(m.expenses)}</span>
                            <span className="text-xs text-on-surface-variant">Накопления: {formatMoney(m.contributions)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-surface-container-high">
                        <div className={color} style={{ width: `${incomePct}%` }}></div>
                        <div className="bg-error" style={{ width: `${100 - incomePct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant text-center py-4">Нет данных о транзакциях</p>
            )}
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      <Modal isOpen={transferModalOpen} onClose={() => { setTransferModalOpen(false); setTransferTarget(null); }} title="Передать владение">
        <div className="space-y-6">
          <p className="text-sm text-on-surface-variant">Выберите участника, которому хотите передать права владельца:</p>
          <div className="space-y-2">
            {family.members?.filter(m => m.id !== user.id).map(m => (
              <button key={m.id} onClick={() => setTransferTarget(m)} className={`w-full text-left p-4 rounded-2xl border-2 transition ${
                transferTarget?.id === m.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:bg-surface-container'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {m.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{m.name}</p>
                    <p className="text-xs text-on-surface-variant">{m.email}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setTransferModalOpen(false); setTransferTarget(null); }} className="btn-ghost px-6 py-3">Отмена</button>
            <button disabled={!transferTarget} onClick={transferOwnership} className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">Передать</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />

      {promptModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/50" onClick={() => setPromptModal({ open: false })}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-surface-container-lowest rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-surface-container-lowest px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-bold font-headline text-on-surface">{promptModal.title}</h3>
                <div className="mt-4">
                  <input
                    type="text"
                    className="input-ghost w-full"
                    placeholder={promptModal.placeholder}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        promptModal.onSubmit(e.target.value.trim());
                        setPromptModal({ open: false });
                      }
                    }}
                  />
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                  <button onClick={() => setPromptModal({ open: false })} className="btn-ghost px-4 py-2.5">Отмена</button>
                  <button onClick={(e) => {
                    const val = e.target.parentElement.parentElement.querySelector('input').value.trim();
                    if (val) { promptModal.onSubmit(val); setPromptModal({ open: false }); }
                  }} className="btn-primary px-4 py-2.5">ОК</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
