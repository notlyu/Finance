import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Family() {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      setFamily(res.data.family);
      setInviteCode(res.data.family?.invite_code || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    setInvitesLoading(true);
    try {
      const res = await api.get('/auth/family/invites');
      setInvites(res.data);
    } catch (err) {
      console.error(err);
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      alert('Код приглашения скопирован');
    }
  };

  const leaveFamily = async () => {
    if (!window.confirm('Вы уверены, что хотите покинуть семью?')) return;
    try {
      await api.post('/auth/family/leave');
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const removeMember = async (memberId, memberName) => {
    if (!window.confirm(`Удалить ${memberName} из семьи?`)) return;
    try {
      await api.delete(`/auth/family/members/${memberId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  if (!family) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Семья</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">Вы пока не состоите в семье.</p>
          <button
            onClick={async () => {
              const name = prompt('Введите название новой семьи');
              if (!name) return;
              try {
                await api.post('/auth/family/create', { name });
                fetchData();
              } catch (err) {
                alert(err.response?.data?.message || 'Ошибка');
              }
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 mr-2"
          >
            Создать семью
          </button>
          <button
            onClick={async () => {
              const code = prompt('Введите код приглашения');
              if (!code) return;
              try {
                await api.post('/auth/family/join', { inviteCode: code });
                fetchData();
              } catch (err) {
                alert(err.response?.data?.message || 'Ошибка');
              }
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Присоединиться по коду
          </button>
        </div>
      </div>
    );
  }

  const isOwner = family.owner_user_id === user.id;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Семья</h1>

      {/* Информация о семье */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{family.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Код приглашения: <strong className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{inviteCode}</strong></p>
          </div>
          <button
            onClick={copyInviteCode}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm"
          >
            Копировать код
          </button>
        </div>
      </div>

      {/* Приглашения */}
      {isOwner && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Приглашения</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Создавайте временные коды приглашений (их можно отозвать).
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await api.post('/auth/family/invites', { expiresInDays: 7 });
                    await fetchInvites();
                  } catch (err) {
                    alert(err.response?.data?.message || 'Ошибка');
                  }
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                + Создать (7 дней)
              </button>
              <button
                onClick={fetchInvites}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Обновить
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {invitesLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка…</p>
            ) : invites.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Нет активных приглашений.</p>
            ) : (
              invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate font-mono">
                      {inv.code}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Истекает: {inv.expires_at ? new Date(inv.expires_at).toLocaleString() : 'не истекает'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inv.code);
                        alert('Код приглашения скопирован');
                      }}
                      className="px-3 py-1.5 rounded-md text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25"
                    >
                      Копировать
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Отозвать это приглашение?')) return;
                        try {
                          await api.delete(`/auth/family/invites/${inv.id}`);
                          await fetchInvites();
                        } catch (err) {
                          alert(err.response?.data?.message || 'Ошибка');
                        }
                      }}
                      className="px-3 py-1.5 rounded-md text-sm text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      Отозвать
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Список участников */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
          Участники семьи ({family.members?.length || 0})
        </h2>
        <div className="space-y-2">
          {family.members?.map(member => {
            const isMemberOwner = member.id === family.owner_user_id;
            return (
              <div key={member.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {member.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isMemberOwner ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                      👑 Владелец
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                      Участник
                    </span>
                  )}
                  {isOwner && !isMemberOwner && (
                    <button
                      onClick={() => removeMember(member.id, member.name)}
                      className="text-red-500 hover:text-red-700 text-sm ml-2"
                      title="Удалить из семьи"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Действия */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Действия</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={copyInviteCode}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Пригласить (скопировать код)
          </button>
          {!isOwner && (
            <button
              onClick={leaveFamily}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200"
            >
              Покинуть семью
            </button>
          )}
          {isOwner && family.members && family.members.length > 1 && (
            <button
              onClick={() => setTransferModalOpen(true)}
              className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-md hover:bg-yellow-200"
            >
              Передать владение
            </button>
          )}
        </div>
      </div>

      {/* Модальное окно передачи владения */}
      <Modal isOpen={transferModalOpen} onClose={() => { setTransferModalOpen(false); setTransferTarget(null); }} title="Передать владение">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Выберите участника, которому хотите передать права владельца:
          </p>
          <div className="space-y-2">
            {family.members?.filter(m => m.id !== user.id).map(m => (
              <button
                key={m.id}
                onClick={() => setTransferTarget(m)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  transferTarget?.id === m.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {m.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setTransferModalOpen(false); setTransferTarget(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Отмена</button>
            <button
              onClick={async () => {
                if (!transferTarget) return;
                if (!window.confirm(`Передать владение семьёй участнику ${transferTarget.name}?`)) return;
                try {
                  await api.post('/auth/family/transfer-ownership', { newOwnerId: transferTarget.id });
                  setTransferModalOpen(false);
                  setTransferTarget(null);
                  fetchData();
                } catch (err) {
                  alert(err.response?.data?.message || 'Ошибка');
                }
              }}
              disabled={!transferTarget}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Передать
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}