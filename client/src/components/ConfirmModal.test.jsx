import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal', () => {
  it('renders message and title', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Title"
        message="Are you sure?"
        confirmText="Подтвердить"
        cancelText="Отмена"
      />
    );
    expect(screen.getByText('Confirm Title')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        title="Confirm"
        message="Sure?"
        confirmText="Подтвердить"
        cancelText="Отмена"
      />
    );
    fireEvent.click(screen.getByText('Подтвердить'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button clicked', () => {
    const onClose = jest.fn();
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Sure?"
        confirmText="Подтвердить"
        cancelText="Отмена"
      />
    );
    fireEvent.click(screen.getByText('Отмена'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows custom confirm and cancel text', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Sure?"
        confirmText="Yes, delete"
        cancelText="No, keep"
      />
    );
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });

  it('applies danger variant styles', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Sure?"
        confirmText="Подтвердить"
        cancelText="Отмена"
        variant="danger"
      />
    );
    const confirmBtn = screen.getByText('Подтвердить');
    expect(confirmBtn.className).toContain('bg-error');
  });

  it('returns null when isOpen is false', () => {
    render(
      <ConfirmModal
        isOpen={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Sure?"
        confirmText="Подтвердить"
        cancelText="Отмена"
      />
    );
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Sure?"
        confirmText="Подтвердить"
        cancelText="Отмена"
        loading={true}
      />
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });
});
