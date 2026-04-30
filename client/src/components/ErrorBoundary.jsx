import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-4">
          <div className="max-w-md w-full bg-surface-container-lowest rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-error text-3xl">error</span>
            </div>
            <h1 className="text-xl font-bold text-on-surface mb-2">Что-то пошло не так</h1>
            <p className="text-on-surface-variant text-sm mb-6">
              Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
            </p>
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
