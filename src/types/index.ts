export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

export type ProgramType = 
  | "WEDDING"
  | "BIRTHDAY"
  | "CORPORATE"
  | "RECEPTION"
  | "ANNIVERSARY"
  | "OTHER";

export type ProgramStatus = 
  | "UPCOMING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type StaffAssignmentStatus = 
  | "ASSIGNED"
  | "JOINED"
  | "REJECTED"
  | "COMPLETED";

export type AttendanceStatus = 
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY";

export type PaymentStatus = 
  | "PAID"
  | "PENDING"
  | "PARTIAL"
  | "OVERDUE"
  | "UNPAID";

export type PayoutStatus = 
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "CANCELLED";

export type ProductType = 
  | "CATERING_FOOD"
  | "RENTAL_EQUIPMENT"
  | "SERVICE";

export interface ProgramSummary {
  id: string;
  code: string;
  title: string;
  customerName: string;
  customerPhone: string;
  type: ProgramType;
  date: string;
  time: string;
  location: string;
  employeesJoined: number;
  employeesRequired: number;
  status: ProgramStatus;
  budget: number;
}

export interface EmployeePaymentSummary {
  id: string;
  payoutNumber: string;
  employeeName: string;
  employeeDesignation: string;
  programTitle: string;
  eventDate: string;
  hoursWorked: number;
  rate: number;
  amount: number;
  status: PayoutStatus;
}

export interface CustomerOutstandingSummary {
  id: string;
  customerName: string;
  phone: string;
  companyName?: string;
  totalBilled: number;
  paidAmount: number;
  outstanding: number;
  lastInvoiceDate: string;
  status: "CURRENT" | "OVERDUE" | "SETTLED";
}

export interface Alert {
  id: string;
  type: "LOW_STOCK" | "PENDING_PAYMENT" | "OVERDUE_CUSTOMER" | "UNDERSTAFFED_PROGRAM" | "PENDING_INVOICE";
  title: string;
  description: string;
  link?: string;
  severity: "info" | "warning" | "critical";
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  userName: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
}


export interface LowStockProductSummary {
  id: string;
  code: string;
  name: string;
  category: string;
  type: ProductType;
  currentStock: number;
  minStockAlert: number;
  unit: string;
}

export interface DashboardKPIData {
  todaysProgramsCount: number;
  upcomingProgramsCount: number;
  employeesWorkingToday: number;
  totalScheduledEmployeesToday: number;
  pendingPaymentsAmount: number;
  pendingEmployeePayoutsCount: number;
  customerOutstandingTotal: number;
}
