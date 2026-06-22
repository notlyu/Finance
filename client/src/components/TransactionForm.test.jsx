import { render, screen, fireEvent } from '@testing-library/react';
import TransactionForm from './TransactionForm';

function createMockForm() {
  const formState = { type: 'expense', scope: 'personal' };
  return {
    register: jest.fn(() => ({})),
    handleSubmit: jest.fn(fn => e => { e?.preventDefault?.(); fn(formState); }),
    onSubmit: jest.fn(),
    watch: jest.fn(key => formState[key]),
    setValue: jest.fn((key, val) => { formState[key] = val; }),
    reset: jest.fn(() => { Object.keys(formState).forEach(k => delete formState[k]); }),
    formState,
  };
}

const categories = [
  { id: 1, name: 'Еда', type: 'expense' },
  { id: 2, name: 'Зарплата', type: 'income' },
];

const accounts = [
  { id: 1, name: 'Наличные' },
  { id: 2, name: 'Карта' },
];

function renderForm(overrides = {}) {
  const mock = createMockForm();
  const props = {
    isOpen: true,
    onClose: jest.fn(),
    editingId: null,
    categories,
    accounts,
    space: 'personal',
    hasFamily: false,
    register: mock.register,
    handleSubmit: mock.handleSubmit,
    onSubmit: mock.onSubmit,
    watch: mock.watch,
    setValue: mock.setValue,
    reset: mock.reset,
    ...overrides,
    ...(overrides.hasOwnProperty('isOpen') && !overrides.isOpen ? {} : {}),
  };
  if (overrides.isOpen === false) {
    Object.assign(props, { register: mock.register, handleSubmit: mock.handleSubmit, onSubmit: mock.onSubmit, watch: mock.watch, setValue: mock.setValue, reset: mock.reset, categories, accounts });
  }
  return { ...mock, ...render(<TransactionForm {...props} />), props };
}

describe('TransactionForm', () => {
  it('renders form fields', () => {
    renderForm();
    expect(screen.getByText('Добавить операцию')).toBeInTheDocument();
    expect(screen.getByText('Сумма')).toBeInTheDocument();
    expect(screen.getByText('Расход')).toBeInTheDocument();
    expect(screen.getByText('Доход')).toBeInTheDocument();
    expect(screen.getByText('Категория')).toBeInTheDocument();
    expect(screen.getByText('Дата')).toBeInTheDocument();
    expect(screen.getByText('Комментарий')).toBeInTheDocument();
    expect(screen.getByText('Добавить')).toBeInTheDocument();
    expect(screen.getByText('Отмена')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const mock = createMockForm();
    render(
      <TransactionForm
        isOpen={false}
        onClose={jest.fn()}
        categories={categories}
        accounts={accounts}
        register={mock.register}
        handleSubmit={mock.handleSubmit}
        onSubmit={mock.onSubmit}
        watch={mock.watch}
        setValue={mock.setValue}
        reset={mock.reset}
      />
    );
    expect(screen.queryByText('Добавить операцию')).not.toBeInTheDocument();
  });

  it('renders accounts select when accounts exist', () => {
    renderForm();
    expect(screen.getByText('Счет')).toBeInTheDocument();
  });

  it('does not render accounts select when no accounts', () => {
    renderForm({ accounts: [] });
    expect(screen.queryByText('Счет')).not.toBeInTheDocument();
  });

  it('submits with correct data', () => {
    const { handleSubmit, onSubmit } = renderForm();
    fireEvent.click(screen.getByText('Добавить'));
    expect(handleSubmit).toHaveBeenCalledWith(onSubmit);
  });

  it('calls onClose when cancel is clicked', () => {
    const { props } = renderForm();
    fireEvent.click(screen.getByText('Отмена'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows edit mode title and button text', () => {
    renderForm({ editingId: 5 });
    expect(screen.getByText('Редактировать операцию')).toBeInTheDocument();
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
  });

  it('switches type when toggle buttons are clicked', () => {
    const { setValue } = renderForm();
    fireEvent.click(screen.getByText('Доход'));
    expect(setValue).toHaveBeenCalledWith('type', 'income');
    fireEvent.click(screen.getByText('Расход'));
    expect(setValue).toHaveBeenCalledWith('type', 'expense');
  });

  it('filters categories by selected type', () => {
    const mock = createMockForm();
    mock.formState.type = 'income';
    render(
      <TransactionForm
        isOpen={true}
        onClose={jest.fn()}
        categories={categories}
        accounts={accounts}
        register={mock.register}
        handleSubmit={mock.handleSubmit}
        onSubmit={mock.onSubmit}
        watch={mock.watch}
        setValue={mock.setValue}
        reset={mock.reset}
      />
    );
    const selects = screen.getAllByRole('combobox');
    const catSelect = selects[0];
    const optionTexts = Array.from(catSelect.options).map(o => o.textContent);
    expect(optionTexts).toContain('Зарплата');
    expect(optionTexts).not.toContain('Еда');
  });

  it('renders scope chips for family users', () => {
    renderForm({ hasFamily: true, space: 'family' });
    expect(screen.getByText('🔒 Личное')).toBeInTheDocument();
    expect(screen.getByText('👥 Семья')).toBeInTheDocument();
    expect(screen.getByText(/Кто видит операцию/)).toBeInTheDocument();
  });

  it('does not render scope chips for solo user (no family)', () => {
    renderForm({ hasFamily: false });
    expect(screen.queryByText('🔒 Личное')).not.toBeInTheDocument();
    expect(screen.queryByText('👥 Семья')).not.toBeInTheDocument();
  });

  it('disables the «Личное» chip when a family account is selected (§4.2)', () => {
    const famAccounts = [{ id: 1, name: 'Общий счёт', scope: 'family' }];
    const mock = createMockForm();
    mock.formState.account_id = 1;
    mock.formState.scope = 'family';
    render(
      <TransactionForm
        isOpen={true}
        onClose={jest.fn()}
        categories={categories}
        accounts={famAccounts}
        hasFamily={true}
        space="family"
        register={mock.register}
        handleSubmit={mock.handleSubmit}
        onSubmit={mock.onSubmit}
        watch={mock.watch}
        setValue={mock.setValue}
        reset={mock.reset}
      />
    );
    expect(screen.getByText('🔒 Личное').closest('button')).toBeDisabled();
  });
});
