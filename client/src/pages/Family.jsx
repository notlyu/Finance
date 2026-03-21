import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Family() {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const navigate = useNavigate();

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
    if (!window.confirm('Вы уверены, что хотите покинуть семью? Все ваши данные останутся, но вы перестанете видеть семейные операции.')) return;
    try {
      // Здесь нужен API для выхода из семьи, пока его нет. Можно реализовать как PUT /api/auth/family/leave
      // Временно: показываем сообщение о необходимости реализовать эндпоинт
      alert('Функция в разработке. Необходимо добавить API для выхода из семьи.');
      // После реализации: await api.post('/auth/family/leave'); fetchData(); navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  if (!family) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Семья</h1>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">Вы пока не состоите в семье.</p>
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
      <h1 className="text-2xl font-bold text-gray-900">Семья</h1>

      {/* Информация о семье */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">{family.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Код приглашения: <strong>{inviteCode}</strong></p>
          </div>
          <button
            onClick={copyInviteCode}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            Копировать код
          </button>
        </div>
      </div>

      {/* Список участников */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Участники семьи</h2>
        <div className="space-y-2">
          {family.members?.map(member => (
            <div key={member.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <span className="font-medium">{member.name}</span>
                <span className="text-sm text-gray-500 ml-2">{member.email}</span>
              </div>
              <div className="text-sm">
                {member.id === family.owner_user_id ? (
                  <span className="text-indigo-600">Владелец</span>
                ) : (
                  <span className="text-gray-500">Участник</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Действия */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Действия</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={copyInviteCode}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
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
          {isOwner && (
            <button
              onClick={() => alert('Функция передачи владения в разработке')}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              Передать владение
            </button>
          )}
        </div>
      </div>
    </div>
  );
}