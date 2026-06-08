import { render, screen, fireEvent } from '@testing-library/react';
import TransactionList from './TransactionList';

const transactions = [
  { id: 1, type: 'expense', amount: 1500, category_name: 'Еда', date: '2025-01-15', user_name: 'Анна', comment: 'Обед', is_hidden: false, account_name: 'Карта' },
  { id: 2, type: 'income', amount: 100000, category_name: 'Зарплата', date: '2025-01-10', user_name: 'Анна', comment: '', is_hidden: false },
  { id: 3, type: 'expense', amount: 5000, category_name: 'Подарок', date: '2025-01-20', user_name: 'Анна', comment: '', is_hidden: true },
];

describe('TransactionList', () => {
  it('renders list of transactions', () => {
    render(<TransactionList transactions={transactions} onEdit={jest.fn()} onDelete={jest.fn()} onDuplicate={jest.fn()} />);
    expect(screen.getAllByText('Еда').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Зарплата').length).toBeGreaterThanOrEqual(1);
  });

  it('shows hidden transaction as Сюрприз', () => {
    render(<TransactionList transactions={transactions} onEdit={jest.fn()} onDelete={jest.fn()} onDuplicate={jest.fn()} />);
    expect(screen.getAllByText('🔒 Сюрприз').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no transactions', () => {
    render(<TransactionList transactions={[]} onEdit={jest.fn()} onDelete={jest.fn()} onDuplicate={jest.fn()} />);
    expect(screen.getAllByText('Нет операций').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = jest.fn();
    render(<TransactionList transactions={[transactions[0]]} onEdit={jest.fn()} onDelete={onDelete} onDuplicate={jest.fn()} />);
    const deleteBtns = screen.getAllByTitle('Удалить');
    fireEvent.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(<TransactionList transactions={[transactions[0]]} onEdit={onEdit} onDelete={jest.fn()} onDuplicate={jest.fn()} />);
    const editBtns = screen.getAllByTitle('Изменить');
    fireEvent.click(editBtns[0]);
    expect(onEdit).toHaveBeenCalledWith(transactions[0]);
  });

  it('calls onDuplicate when duplicate button clicked', () => {
    const onDuplicate = jest.fn();
    render(<TransactionList transactions={[transactions[0]]} onEdit={jest.fn()} onDelete={jest.fn()} onDuplicate={onDuplicate} />);
    const dupBtns = screen.getAllByTitle('Дублировать');
    fireEvent.click(dupBtns[0]);
    expect(onDuplicate).toHaveBeenCalledWith(transactions[0]);
  });

  it('shows load more button when hasMore is true', () => {
    render(<TransactionList transactions={transactions} hasMore={true} onLoadMore={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} onDuplicate={jest.fn()} />);
    expect(screen.getAllByText('Загрузить ещё').length).toBeGreaterThanOrEqual(1);
  });

  it('hides edit/delete for hidden transactions', () => {
    render(<TransactionList transactions={[transactions[2]]} onEdit={jest.fn()} onDelete={jest.fn()} onDuplicate={jest.fn()} />);
    expect(screen.queryByTitle('Удалить')).not.toBeInTheDocument();
    expect(screen.getByText('Скрыто')).toBeInTheDocument();
  });

  it('calls onLoadMore when load more clicked', () => {
    const onLoadMore = jest.fn();
    render(<TransactionList transactions={[transactions[0]]} hasMore={true} onLoadMore={onLoadMore} onEdit={jest.fn()} onDelete={jest.fn()} onDuplicate={jest.fn()} />);
    fireEvent.click(screen.getAllByText('Загрузить ещё')[0]);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
