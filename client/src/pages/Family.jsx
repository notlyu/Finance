import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Family() {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [invites, setInvites] = useState([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      setFamily(res.data.family);
      setInviteCode(res.data.family?.invite_code || '');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchInvites = async () => {
    try { const res = await api.get('/auth/family/invites'); setInvites(res.data); }
    catch (err) { console.error(err); setInvites([]); }
  };

  useEffect(() => { fetchData(); }, []);

  const copyInviteCode = () => {
    if (inviteCode) { navigator.clipboard.writeText(inviteCode); alert('Код приглашения скопирован'); }
  };

  const leaveFamily = async () => {
    if (!window.confirm('Вы уверены, что хотите покинуть семью?')) return;
    try { await api.post('/auth/family/leave'); window.location.reload(); }
    catch (err) { alert(err.response?.data?.message || 'Ошибка'); }
  };

  const removeMember = async (memberId, memberName) => {
    if (!window.confirm(`Удалить ${memberName} из семьи?`)) return;
    try { await api.delete(`/auth/family/members/${memberId}`); fetchData(); }
    catch (err) { alert(err.response?.data?.message || 'Ошибка'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  if (!family) {
    return (
      <div className="space-y-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Семья</h2>
        <div className="bg-surface-container-lowest p-12 rounded-3xl shadow-card text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-primary">groups</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Вы пока не состоите в семье</h3>
          <p className="text-on-surface-variant text-sm mb-8 max-w-md mx-auto">Создайте семью или присоединитесь по коду приглашения, чтобы управлять финансами вместе</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={async () => { const name = prompt('Введите название новой семьи'); if (!name) return; try { await api.post('/auth/family/create', { name }); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Ошибка'); } }} className="btn-primary px-8 py-3">
              <span className="material-symbols-outlined text-sm mr-1">add_circle</span>
              Создать семью
            </button>
            <button onClick={async () => { const code = prompt('Введите код приглашения'); if (!code) return; try { await api.post('/auth/family/join', { inviteCode: code }); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Ошибка'); } }} className="btn-ghost px-8 py-3">
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link to="/" className="hover:text-primary transition-colors">Главная</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-on-surface font-medium">Семья</span>
      </div>

      {/* Section Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Семья</h2>
        <p className="text-on-surface-variant text-sm mt-1">Управление семейным аккаунтом</p>
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

      {/* Invitations (owner only) */}
      {isOwner && (
        <div className="bg-surface-container p-6 rounded-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold font-headline">Приглашения</h3>
              <p className="text-sm text-on-surface-variant">Временные коды для новых участников</p>
            </div>
            <div className="flex gap-2">
              <button onClick={async () => { try { await api.post('/auth/family/invites', { expiresInDays: 7 }); fetchInvites(); } catch (err) { alert(err.response?.data?.message || 'Ошибка'); } }} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2">
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
                    <button onClick={() => { navigator.clipboard.writeText(inv.code); alert('Код скопирован'); }} className="btn-ghost px-3 py-1.5 text-xs">Копировать</button>
                    <button onClick={async () => { if (!window.confirm('Отозвать приглашение?')) return; try { await api.delete(`/auth/family/invites/${inv.id}`); fetchInvites(); } catch (err) { alert(err.response?.data?.message || 'Ошибка'); } }} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-error bg-error-container hover:opacity-90 transition-colors">Отозвать</button>
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
            <button disabled={!transferTarget} onClick={async () => { if (!transferTarget) return; if (!window.confirm(`Передать владение участнику ${transferTarget.name}?`)) return; try { await api.post('/auth/family/transfer-ownership', { newOwnerId: transferTarget.id }); setTransferModalOpen(false); setTransferTarget(null); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Ошибка'); } }} className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">Передать</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
