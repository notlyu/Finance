import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  it('renders content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Title">
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('returns null when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Title">
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Title">
        <div>Content</div>
      </Modal>
    );
    const backdrop = container.querySelector('[class*="bg-black"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders title and children', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="My Modal">
        <span data-testid="child">Child element</span>
      </Modal>
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
