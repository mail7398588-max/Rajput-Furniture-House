export interface Customer {
  id: string
  serial_no: number | null
  order_no: string
  order_date: string | null
  customer_name: string | null
  phone: string | null
  item: string | null
  details: string | null
  order_amount: number
  advance: number
  remaining: number
  delivery_date: string | null
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delivered' | 'Cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_no: string
  material_cost: number
  labour_cost: number
  transport_cost: number
  other_cost: number
  total_expense: number
  profit_loss: number
  created_at: string
  updated_at: string
  customers?: Customer
}

export interface Transaction {
  id: string
  date: string
  particulars: string | null
  category: string | null
  income: number
  expense: number
  payment_mode: string | null
  related_order_no: string | null
  balance: number
  month: string | null
  notes: string | null
  created_at: string
}

export interface Attendance {
  id: string
  worker_name: string
  designation: string | null
  monthly_salary: number
  daily_rate: number
  month: string
  year: number
  working_days: number
  attendance_data: Record<string, string>
  ot_data: Record<string, number>
  present_days: number
  absent_days: number
  half_days: number
  payable_days: number
  ot_hours: number
  ot_multiplier: number
  ot_rate: number
  ot_amount: number
  gross_salary: number
  advance: number
  other_deduction: number
  net_payable: number
  paid_amount: number
  remaining: number
  status: string
  created_at: string
}

export interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  pendingOrders: number
  totalOrders: number
  totalCustomers: number
  monthlyData: { month: string; revenue: number; expenses: number; profit: number }[]
  expenseCategories: { category: string; amount: number }[]
}

export type CashMemoItem = {
  sno: number
  detail: string
  rate: number
  qty: number
  amount: number
}
