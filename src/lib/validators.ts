import { ProgramType } from "@prisma/client";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: ValidationError[];
  data?: T;
}

/**
 * Validates Program / Event scheduling payload
 */
export function validateCreateProgramInput(input: {
  title?: string;
  type?: string;
  customerId?: string;
  eventDate?: string | Date;
  startTime?: string;
  endTime?: string;
  venueName?: string;
  venueAddress?: string;
  expectedGuests?: number | string;
  requiredStaffCount?: number | string;
  budget?: number | string;
}): ValidationResult<{
  title: string;
  type: ProgramType;
  customerId: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  expectedGuests: number;
  requiredStaffCount: number;
  budget: number;
}> {
  const errors: ValidationError[] = [];

  if (!input.title || input.title.trim().length < 3) {
    errors.push({ field: "title", message: "Program title must be at least 3 characters long." });
  }

  if (!input.customerId || input.customerId.trim().length === 0) {
    errors.push({ field: "customerId", message: "A valid customer must be assigned." });
  }

  if (!input.eventDate) {
    errors.push({ field: "eventDate", message: "Event date is required." });
  }

  const parsedDate = input.eventDate ? new Date(input.eventDate) : new Date();
  if (isNaN(parsedDate.getTime())) {
    errors.push({ field: "eventDate", message: "Invalid event date format." });
  }

  if (!input.venueName || input.venueName.trim().length === 0) {
    errors.push({ field: "venueName", message: "Venue name is required." });
  }

  const validTypes: ProgramType[] = ["WEDDING", "BIRTHDAY", "CORPORATE", "RECEPTION", "ANNIVERSARY", "OTHER"];
  const type = (input.type && validTypes.includes(input.type as ProgramType))
    ? (input.type as ProgramType)
    : "WEDDING";

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      title: input.title!.trim(),
      type,
      customerId: input.customerId!.trim(),
      eventDate: parsedDate,
      startTime: input.startTime || "17:00",
      endTime: input.endTime || "23:00",
      venueName: input.venueName!.trim(),
      venueAddress: input.venueAddress?.trim() || "",
      expectedGuests: Number(input.expectedGuests) || 0,
      requiredStaffCount: Number(input.requiredStaffCount) || 0,
      budget: Number(input.budget) || 0,
    },
  };
}

/**
 * Validates Employee registration payload
 */
export function validateCreateEmployeeInput(input: {
  name?: string;
  phone?: string;
  email?: string;
  employeeTypeId?: string;
  wagePerEvent?: number | string;
}): ValidationResult<{
  name: string;
  phone: string;
  email?: string;
  employeeTypeId: string;
  wagePerEvent: number;
}> {
  const errors: ValidationError[] = [];

  if (!input.name || input.name.trim().length < 2) {
    errors.push({ field: "name", message: "Employee name is required." });
  }

  if (!input.phone || input.phone.trim().length < 6) {
    errors.push({ field: "phone", message: "Valid phone number is required." });
  }

  if (!input.employeeTypeId || input.employeeTypeId.trim().length === 0) {
    errors.push({ field: "employeeTypeId", message: "Employee designation/type must be selected." });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      name: input.name!.trim(),
      phone: input.phone!.trim(),
      email: input.email?.trim(),
      employeeTypeId: input.employeeTypeId!.trim(),
      wagePerEvent: Math.max(0, Number(input.wagePerEvent) || 0),
    },
  };
}


/**
 * Validates Invoice & item calculations
 */
export function validateInvoiceCalculations(input: {
  subtotal: number;
  taxRate: number;
  discount: number;
  paidAmount?: number;
}): {
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
} {
  const subtotal = Math.max(0, input.subtotal);
  const discount = Math.max(0, input.discount);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = Number(((discountedSubtotal * input.taxRate) / 100).toFixed(2));
  const grandTotal = Number((discountedSubtotal + taxAmount).toFixed(2));
  const paidAmount = Math.max(0, input.paidAmount || 0);
  const outstandingAmount = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));

  return {
    taxAmount,
    grandTotal,
    paidAmount,
    outstandingAmount,
  };
}
