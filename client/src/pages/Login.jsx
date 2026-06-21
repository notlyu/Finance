import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import logger from '../utils/logger';

const PASSWORD_RULES = [
  { label: 'Минимум 8 символов', test: (p) => p.length >= 8 },
  { label: 'Заглавная буква', test: (p) => /[A-Z]/.test(p) },
  { label: 'Строчная буква', test: (p) => /[a-z]/.test(p) },
  { label: 'Цифра', test: (p) => /[0-9]/.test(p) },
  { label: 'Спецсимвол (!@#$%^&*)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }) {
  const strength = useMemo(() => {
    const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
    if (!password) return { level: 0, label: '', color: '' };
    if (passed <= 2) return { level: 1, label: 'Слабый', color: 'bg-error' };
    if (passed <= 3) return { level: 2, label: 'Средний', color: 'bg-warning' };
    if (passed <= 4) return { level: 3, label: 'Хороший', color: 'bg-secondary' };
    return { level: 4, label: 'Надёжный', color: 'bg-primary' };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : 'bg-surface-container-high'}`} />
        ))}
      </div>
      <p className="text-xs font-medium text-on-surface-variant">{strength.label}</p>
      <div className="space-y-0.5">
        {PASSWORD_RULES.map(rule => {
          const ok = rule.test(password);
          return (
            <p key={rule.label} className={`text-xs flex items-center gap-1 ${ok ? 'text-secondary' : 'text-outline'}`}>
              <span className="material-symbols-outlined text-sm">{ok ? 'check_circle' : 'radio_button_unchecked'}</span>
              {rule.label}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
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
    if (!isLogin && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    try {
      const body = isLogin
        ? { email, password, rememberMe }
        : { email, password, name };
      console.log('Sending login request:', { email: body.email, passwordLength: body.password?.length });
      const res = await api.post(isLogin ? '/auth/login' : '/auth/register', body, { withCredentials: true });
      console.log('Login response:', res.status, res.data);
      if (res.status === 200 || res.status === 201) {
        // Сервер выставил cookie-сессию; пользователя берём из /me (токен в JS не храним).
        await login();
        navigate('/');
        return;
      }
    } catch (err) {
      console.error('Login error:', err.response?.status, err.response?.data);
      console.error('Full error:', err);
      logger.error('Login error:', err);
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
                      <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:opacity-80 transition-colors">Забыли?</Link>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">lock</span>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
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
                  {!isLogin && <PasswordStrength password={password} />}
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Подтверждение пароля</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">lock</span>
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-ghost pl-12 pr-12"
                        placeholder="Повторите пароль"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRememberMe(v => !v)}
                      role="switch"
                      aria-checked={rememberMe}
                      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors shrink-0 ${rememberMe ? 'bg-primary' : 'bg-surface-container-high'}`}
                    >
                      <span className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${rememberMe ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                    <label className="text-sm text-on-surface-variant cursor-pointer select-none" onClick={() => setRememberMe(v => !v)}>
                      Запомнить меня
                    </label>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 bg-primary text-white font-bold text-lg rounded-3xl shadow-button hover:opacity-90 active:scale-[0.98] transition-all duration-200"
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
                  className="w-full py-3.5 border-2 border-outline-variant hover:border-primary/40 hover:bg-surface-container text-on-surface font-bold text-sm rounded-3xl transition-all flex items-center justify-center gap-2"
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
