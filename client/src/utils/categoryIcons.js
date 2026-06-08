const categoryIconMap = {
  income: 'payments',
  expense: 'shopping_cart',
  food: 'restaurant',
  transport: 'directions_car',
  entertainment: 'movie',
  health: 'local_hospital',
  education: 'school',
  home: 'home',
  clothing: 'checkroom',
  gifts: 'card_giftcard',
  salary: 'work',
  freelance: 'laptop',
  investment: 'trending_up',
  other: 'more_horiz',
};

export const getCategoryIcon = (catName) => {
  if (!catName) return 'receipt_long';
  const lower = catName.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIconMap)) {
    if (lower.includes(key)) return icon;
  }
  return 'receipt_long';
};
