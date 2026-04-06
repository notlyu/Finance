import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetToken = searchParams.get('token');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [step, setStep] = useState(resetToken ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleTheme = () => {
    const nextIsDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
    setIsDark(nextIsDark);
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('Письмо со ссылкой отправлено на email');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: resetToken, newPassword: password });
      setSuccess('Пароль изменён. Теперь можете войти.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body selection:bg-primary-container selection:text-white">
      <header className="fixed top-0 right-0 left-0 z-30 flex justify-between items-center px-6 py-4 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
          <span className="brand-font text-xl font-extrabold tracking-tight text-on-surface">Финансы</span>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant">{isDark ? 'light_mode' : 'dark_mode'}</span>
        </button>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 pt-20 pb-12">
        <div className="max-w-md w-full relative">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl -z-10"></div>

          <div className="bg-surface-container-lowest rounded-3xl shadow-ambient overflow-hidden">
            <div className="p-8 md:p-10">
              <div className="mb-10">
                <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-on-surface leading-tight font-headline">
                  {step === 'request' ? 'Восстановление пароля' : 'Новый пароль'}
                </h1>
                <p className="text-on-surface-variant text-base">
                  {step === 'request' 
                    ? 'Введите email для отправки ссылки' 
                    : 'Введите новый пароль'}
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

              {success && (
                <div className="mb-6 p-4 bg-tertiary-container rounded-xl flex items-start gap-3 border-l-4 border-tertiary">
                  <span className="material-symbols-outlined text-tertiary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="text-sm font-semibold text-on-tertiary-container">Успешно</p>
                    <p className="text-xs text-on-tertiary-container/80">{success}</p>
                  </div>
                </div>
              )}

              {!success && (
                <form className="space-y-6" onSubmit={step === 'request' ? handleRequestReset : handleResetPassword}>
                  {step === 'request' ? (
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
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Новый пароль</label>
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
                            placeholder="Минимум 6 символов"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface-variant">
                            <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Подтвердите пароль</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">lock</span>
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-ghost pl-12"
                            placeholder="Повторите пароль"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-lg rounded-2xl shadow-button hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {loading ? 'Отправка...' : step === 'request' ? 'Отправить ссылку' : 'Изменить пароль'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-10 pt-8 border-t border-surface-container flex flex-col items-center gap-4">
                <a href="/login" className="w-full py-3.5 border-2 border-outline-variant hover:border-primary/40 hover:bg-surface-container text-on-surface font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Вернуться ко входу
                </a>
              </div>
            </div>

            <div className="bg-surface-container-low p-6 flex justify-center items-center">
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface">Digital Curator System</span>
                <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
