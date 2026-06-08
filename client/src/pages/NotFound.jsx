import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-5xl text-primary">search</span>
        </div>
        <h1 className="text-6xl font-headline font-extrabold text-on-surface mb-2">404</h1>
        <p className="text-xl font-headline font-bold text-on-surface mb-2">Страница не найдена</p>
        <p className="text-on-surface-variant mb-8">Страница, которую вы ищете, не существует или была перемещена.</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-sm">
          <span className="material-symbols-outlined text-sm">home</span>
          На главную
        </Link>
      </div>
    </div>
  );
}