export interface User {
  id: number;
  email: string;
  name: string;
  family_id: number | null;
  family?: Family | null;
}

export interface Family {
  id: number;
  name: string;
  invite_code: string;
  owner_user_id: number;
  members?: User[];
}

export interface Transaction {
  id: number;
  user_id: number;
  family_id: number | null;
  category_id: number;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  comment?: string;
  is_private: boolean;
  category?: Category;
  user?: User;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface Goal {
  id: number;
  user_id: number;
  family_id: number | null;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  category_id?: number;
  auto_contribute_percent?: number;
  is_archived: boolean;
  created_at: string;
  Category?: Category;
}

export interface Wish {
  id: number;
  user_id: number;
  family_id: number | null;
  name: string;
  cost: number;
  saved_amount: number;
  priority: number;
  status: 'active' | 'completed' | 'postponed';
  category_id?: number;
  is_private: boolean;
  archived: boolean;
}

export interface Budget {
  id: number;
  user_id: number;
  family_id: number | null;
  category_id: number;
  month: string;
  limit: number;
  spent: number;
  Category?: Category;
}

export interface RecurringTransaction {
  id: number;
  user_id: number;
  family_id: number | null;
  category_id: number;
  amount: number;
  type: 'income' | 'expense';
  day_of_month: number;
  start_month: string;
  comment?: string;
  is_private: boolean;
  active: boolean;
}

export interface SafetyPillowData {
  current: number;
  target: number;
  months: number;
  monthly_expenses: number;
  recommended_contribution: number;
}

export interface DashboardData {
  personal: {
    balance: number;
    income: number;
    expense: number;
  };
  family?: {
    balance: number;
    income: number;
    expense: number;
    member_contributions: Array<{
      user_id: number;
      name: string;
      contribution: number;
      percent: number;
    }>;
  };
  goals: Goal[];
  recent_transactions: Transaction[];
}

export interface ReportData {
  dynamics: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
  expenses_by_category: Array<{
    category_id: number;
    category_name: string;
    total: number;
  }>;
  income_by_category: Array<{
    category_id: number;
    category_name: string;
    total: number;
  }>;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}