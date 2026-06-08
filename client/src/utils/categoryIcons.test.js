import { getCategoryIcon } from './categoryIcons';

describe('getCategoryIcon', () => {
  it('returns default icon for null/undefined', () => {
    expect(getCategoryIcon(null)).toBe('receipt_long');
    expect(getCategoryIcon(undefined)).toBe('receipt_long');
  });

  it('returns "receipt_long" for unknown categories', () => {
    expect(getCategoryIcon('nonexistent')).toBe('receipt_long');
    expect(getCategoryIcon('random')).toBe('receipt_long');
  });

  it('returns correct icon for exact category names', () => {
    expect(getCategoryIcon('income')).toBe('payments');
    expect(getCategoryIcon('expense')).toBe('shopping_cart');
    expect(getCategoryIcon('food')).toBe('restaurant');
    expect(getCategoryIcon('transport')).toBe('directions_car');
    expect(getCategoryIcon('entertainment')).toBe('movie');
    expect(getCategoryIcon('health')).toBe('local_hospital');
    expect(getCategoryIcon('education')).toBe('school');
    expect(getCategoryIcon('home')).toBe('home');
    expect(getCategoryIcon('clothing')).toBe('checkroom');
    expect(getCategoryIcon('gifts')).toBe('card_giftcard');
    expect(getCategoryIcon('salary')).toBe('work');
    expect(getCategoryIcon('freelance')).toBe('laptop');
    expect(getCategoryIcon('investment')).toBe('trending_up');
    expect(getCategoryIcon('other')).toBe('more_horiz');
  });

  it('does case-insensitive matching', () => {
    expect(getCategoryIcon('Food')).toBe('restaurant');
    expect(getCategoryIcon('FOOD')).toBe('restaurant');
    expect(getCategoryIcon('Transport')).toBe('directions_car');
    expect(getCategoryIcon('SALARY')).toBe('work');
  });

  it('matches by substring', () => {
    expect(getCategoryIcon('food_delivery')).toBe('restaurant');
    expect(getCategoryIcon('transport_service')).toBe('directions_car');
    expect(getCategoryIcon('home_office')).toBe('home');
    expect(getCategoryIcon('education_fee')).toBe('school');
  });
});
