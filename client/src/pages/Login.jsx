import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const nextIsDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
    setIsDark(nextIsDark);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = isLogin
        ? await api.post('/auth/login', { email, password })
        : await api.post('/auth/register', { email, password, name });
      localStorage.setItem('token', response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка');
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body selection:bg-primary-container selection:text-white">
      {/* Top Bar */}
      <header className="fixed top-0 right-0 left-0 z-30 flex justify-between items-center px-6 py-4 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
          <span className="brand-font text-xl font-extrabold tracking-tight text-on-surface">Финансы</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-on-surface-variant">{isDark ? 'light_mode' : 'dark_mode'}</span>
        </button>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 pt-20 pb-12">
        <div className="max-w-md w-full relative">
          {/* Decorative background */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl -z-10"></div>

          <div className="bg-surface-container-lowest rounded-3xl shadow-ambient overflow-hidden">
            <div className="p-8 md:p-10">
              <div className="mb-10">
                <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-on-surface leading-tight font-headline">
                  {isLogin ? 'Добро пожаловать' : 'Создайте аккаунт'}
                </h1>
                <p className="text-on-surface-variant text-base">
                  {isLogin ? 'Управляйте своим капиталом осознанно и спокойно' : 'Начните управлять финансами вашей семьи'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error-container rounded-xl flex items-start gap-3 border-l-4 border-error">
                  <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                  <div>
                    <p className="text-sm font-semibold text-on-error-container">Ошибка</p>
                    <p className="text-xs text-on-error-container/80">{error}</p>
                  </div>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Имя</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">person</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-ghost pl-12"
                        placeholder="Ваше имя"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">alternate_email</span>
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-ghost pl-12"
                      placeholder="example@mail.ru"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest">Пароль</label>
                    {isLogin && (
                      <a href="#" className="text-xs font-semibold text-primary hover:opacity-80 transition-colors">Забыли?</a>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">lock</span>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-ghost pl-12 pr-12"
                      placeholder="Введите пароль"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-lg rounded-2xl shadow-button hover:opacity-90 active:scale-[0.98] transition-all duration-200"
                  >
                    {isLogin ? 'Войти' : 'Зарегистрироваться'}
                  </button>
                </div>
              </form>

              <div className="mt-10 pt-8 border-t border-surface-container flex flex-col items-center gap-4">
                <p className="text-on-surface-variant text-sm font-medium">
                  {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                </p>
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="w-full py-3.5 border-2 border-outline-variant hover:border-primary/40 hover:bg-surface-container text-on-surface font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {isLogin ? 'Зарегистрироваться' : 'Войти'}
                  <span className="material-symbols-outlined text-sm">{isLogin ? 'arrow_forward' : 'arrow_back'}</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-surface-container-low p-6 flex justify-center items-center">
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface">Digital Curator System</span>
                <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="flex -space-x-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="inline-block h-8 w-8 rounded-full ring-4 ring-surface bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high ring-4 ring-surface text-[10px] font-bold text-primary">12k+</div>
            </div>
            <p className="text-xs font-medium text-outline text-center">Присоединяйтесь к 12,000+ семей, управляющих капиталом эффективно.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
