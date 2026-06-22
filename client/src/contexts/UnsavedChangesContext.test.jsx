import { render, screen, fireEvent } from '@testing-library/react';
import { UnsavedChangesProvider, useUnsavedChanges } from './UnsavedChangesContext';

function Harness() {
  const { setDirty, confirmNavigation } = useUnsavedChanges();
  return (
    <div>
      <button onClick={() => setDirty(true)}>mark-dirty</button>
      <button onClick={() => confirmNavigation(() => { document.title = 'PROCEEDED'; })}>go</button>
    </div>
  );
}

function renderHarness() {
  document.title = 'init';
  return render(<UnsavedChangesProvider><Harness /></UnsavedChangesProvider>);
}

describe('UnsavedChangesContext (T3.2)', () => {
  it('proceeds immediately when nothing is dirty', () => {
    renderHarness();
    fireEvent.click(screen.getByText('go'));
    expect(document.title).toBe('PROCEEDED');
    expect(screen.queryByText('Несохранённые изменения')).not.toBeInTheDocument();
  });

  it('shows a confirm dialog when dirty and proceeds only on confirm', () => {
    renderHarness();
    fireEvent.click(screen.getByText('mark-dirty'));
    fireEvent.click(screen.getByText('go'));
    // действие отложено, показан диалог
    expect(document.title).toBe('init');
    expect(screen.getByText('Несохранённые изменения')).toBeInTheDocument();
    // подтверждаем — действие выполняется
    fireEvent.click(screen.getByText('Переключиться'));
    expect(document.title).toBe('PROCEEDED');
  });

  it('cancel keeps the user and discards the pending action', () => {
    renderHarness();
    fireEvent.click(screen.getByText('mark-dirty'));
    fireEvent.click(screen.getByText('go'));
    fireEvent.click(screen.getByText('Остаться'));
    expect(document.title).toBe('init');
    expect(screen.queryByText('Несохранённые изменения')).not.toBeInTheDocument();
  });
});
