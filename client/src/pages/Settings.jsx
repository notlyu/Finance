import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // profile, categories, theme
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { register, handleSubmit, reset } = useForm();

  // Смена пароля
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Категории
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchCategories();
  }, []);

  const onChangePassword = async (data) => {
    setPasswordMessage('');
    setPasswordError('');
    try {
      await api.post('/auth/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      setPasswordMessage('Пароль успешно изменён');
      reset();
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Ошибка');
    }
  };

  const onCreateCategory = async () => {
    if (!newCategoryName) return;
    try {
      await api.post('/categories', {
        name: newCategoryName,
        type: newCategoryType,
      });
      setNewCategoryName('');
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const onDeleteCategory = async (id) => {
    if (window.confirm('Удалить категорию?')) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
      } catch (err) {
        alert(err.response?.data?.message || 'Ошибка');
      }
    }
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setIsDark(isDark);
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Настройки</h1>

      {/* Вкладки */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'profile'
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'categories'
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Категории
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'theme'
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Оформление
          </button>
        </nav>
      </div>

      {/* Профиль */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4 dark:text-white">Информация о пользователе</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Имя</label>
              <p className="mt-1 text-gray-900 dark:text-white">{user?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <p className="mt-1 text-gray-900 dark:text-white">{user?.email}</p>
            </div>
          </div>

          <h2 className="text-lg font-medium mt-8 mb-4 dark:text-white">Смена пароля</h2>
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Старый пароль</label>
              <input
                type="password"
                {...register('oldPassword', { required: true })}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Новый пароль</label>
              <input
                type="password"
                {...register('newPassword', { required: true, minLength: 6 })}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
              />
            </div>
            {passwordMessage && <div className="text-green-600 text-sm">{passwordMessage}</div>}
            {passwordError && <div className="text-red-600 text-sm">{passwordError}</div>}
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Изменить пароль
            </button>
          </form>
        </div>
      )}

      {/* Категории */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4 dark:text-white">Управление категориями</h2>
          <div className="mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Название</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Тип</label>
              <select
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
              >
                <option value="expense">Расход</option>
                <option value="income">Доход</option>
              </select>
            </div>
            <button
              onClick={onCreateCategory}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Добавить
            </button>
          </div>

          <h3 className="text-md font-medium mt-6 mb-2 dark:text-white">Системные категории</h3>
          <div className="space-y-2">
            {categories.filter(c => c.is_system).map(cat => (
              <div key={cat.id} className="flex justify-between items-center py-1">
                <span>{cat.name} <span className="text-xs text-gray-500">({cat.type === 'income' ? 'Доход' : 'Расход'})</span></span>
                <span className="text-xs text-gray-400">Системная</span>
              </div>
            ))}
          </div>

          <h3 className="text-md font-medium mt-6 mb-2 dark:text-white">Пользовательские категории</h3>
          <div className="space-y-2">
            {categories.filter(c => !c.is_system).map(cat => (
              <div key={cat.id} className="flex justify-between items-center py-1 border-b">
                <span>{cat.name} <span className="text-xs text-gray-500">({cat.type === 'income' ? 'Доход' : 'Расход'})</span></span>
                <button onClick={() => onDeleteCategory(cat.id)} className="text-red-600 text-sm">Удалить</button>
              </div>
            ))}
            {categories.filter(c => !c.is_system).length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">Нет пользовательских категорий</p>
            )}
          </div>
        </div>
      )}

      {/* Оформление */}
      {activeTab === 'theme' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4 dark:text-white">Тема оформления</h2>
          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md"
          >
            {isDark ? 'Светлая тема' : 'Тёмная тема'}
          </button>
        </div>
      )}
    </div>
  );
}