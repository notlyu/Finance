import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContributeModal from './ContributeModal';
import api from '../services/api';

jest.mock('../services/api');

describe('ContributeModal', () => {
  const onClose = jest.fn();
  const onContribute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/categories') {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Накопления', type: 'expense' },
            { id: 2, name: 'Продукты', type: 'expense' },
            { id: 3, name: 'Зарплата', type: 'income' },
          ],
        });
      }
      if (url === '/safety-pillow/current') {
        return Promise.resolve({ data: { current: 100000, target: 50000 } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders input and category select when open', async () => {
    render(
      <ContributeModal isOpen={true} onClose={onClose} title="Пополнить цель" onContribute={onContribute} />
    );
    await waitFor(() => expect(screen.queryByText('Загрузка…')).not.toBeInTheDocument());
    expect(screen.getByText('Пополнить цель')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('submits with amount and category when button clicked', async () => {
    render(
      <ContributeModal isOpen={true} onClose={onClose} title="Пополнить" onContribute={onContribute} />
    );
    await waitFor(() => expect(screen.queryByText('Загрузка…')).not.toBeInTheDocument());

    const input = screen.getByRole('spinbutton');
    await userEvent.type(input, '5000');

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '1');

    const submitBtn = screen.getByRole('button', { name: /пополнить/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    expect(onContribute).toHaveBeenCalledWith({ amount: 5000, category_id: 1 });
  });

  it('disables submit when amount is zero or empty', async () => {
    render(
      <ContributeModal isOpen={true} onClose={onClose} title="Пополнить" onContribute={onContribute} />
    );
    await waitFor(() => expect(screen.queryByText('Загрузка…')).not.toBeInTheDocument());

    const submitBtn = screen.getByRole('button', { name: /пополнить/i });
    expect(submitBtn).toBeDisabled();

    const input = screen.getByRole('spinbutton');
    await userEvent.type(input, '0');
    expect(submitBtn).toBeDisabled();
  });

  it('calls onClose when cancel button clicked', async () => {
    render(
      <ContributeModal isOpen={true} onClose={onClose} title="Пополнить" onContribute={onContribute} />
    );
    await waitFor(() => expect(screen.queryByText('Загрузка…')).not.toBeInTheDocument());

    fireEvent.click(screen.getByText('Отмена'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading initially', () => {
    render(
      <ContributeModal isOpen={true} onClose={onClose} title="Пополнить" onContribute={onContribute} />
    );
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('returns nothing when closed', () => {
    const { container } = render(
      <ContributeModal isOpen={false} onClose={onClose} title="Пополнить" onContribute={onContribute} />
    );
    expect(container.innerHTML).toBe('');
  });
});
