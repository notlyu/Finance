import { Component } from 'react';
import logger from '../utils/logger';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.force.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, showDetails } = this.state;
      const isDev = process.env.NODE_ENV === 'development';
      const stackLines = error?.stack?.split('\n') || [];
      const message = error?.message || 'Неизвестная ошибка';

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-4">
          <div className="max-w-lg w-full bg-surface-container-lowest rounded-3xl p-8 shadow-2xl">
            {/* Icon */}
            <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-error text-3xl">error</span>
            </div>

            {/* Title + source badge */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-on-surface">Что-то пошло не так</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-warning/20 text-warning shrink-0">
                Фронтенд
              </span>
            </div>

            {/* Actual error message */}
            <div className="bg-surface-container rounded-xl p-4 mb-6">
              <p className="text-sm font-mono text-on-surface break-words">{message}</p>
            </div>

            {/* Expandable details */}
            {isDev && stackLines.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-2"
                >
                  <span className="material-symbols-outlined text-base">
                    {showDetails ? 'expand_less' : 'expand_more'}
                  </span>
                  {showDetails ? 'Скрыть подробности' : 'Показать подробности'}
                </button>
                {showDetails && (
                  <div className="bg-surface-container-high rounded-xl p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-on-surface-variant font-mono whitespace-pre-wrap">
                      {stackLines.map((line, i) => (
                        <div key={i} className={i === 0 ? 'font-bold text-on-surface mb-1' : 'opacity-80'}>
                          {line}
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Попробовать снова
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 border border-outline-variant text-on-surface font-semibold rounded-xl hover:bg-surface-container transition-colors"
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
