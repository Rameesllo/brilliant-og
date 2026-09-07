/**
 * Notification helper library.
 * Use these functions in API route handlers / server actions to create
 * typed, consistent notifications for lifecycle events.
 *
 * All functions call prisma directly — they are designed to be composed
 * inside prisma.$transaction blocks or called independently.
 */

import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export type NotificationPayload = {
  userId?: string | null; // null = broadcast to all admins
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "ALERT";
  link?: string;
};

/**
 * Core: create a single notification.
 */
export async function createNotification(payload: NotificationPayload) {
  return prisma.notification.create({
    data: {
      userId: payload.userId ?? null,
      title: payload.title,
      message: payload.message,
      type: payload.type ?? "INFO",
      link: payload.link ?? null,
    },
  });
}

  /**
   * Notify all active employees when a new program is available.
   */
  export async function notifyEmployeesProgramCreated(opts: {
    programTitle: string;
    programId: string;
    eventDate: string;
  }) {
    const employees = await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        isActive: true,
        employeeProfile: { status: "ACTIVE" },
      },
      select: { id: true },
    });

    if (employees.length === 0) return;

    await prisma.notification.createMany({
      data: employees.map((employee) => ({
        userId: employee.id,
        title: "New Program Available",
        message: `A new program, "${opts.programTitle}", is scheduled for ${opts.eventDate}.`,
        type: "INFO" as const,
        link: "/employee/programs",
      })),
    });

    await sendPushToUsers(
      employees.map((employee) => employee.id),
      {
        title: "New Program Available",
        body: `${opts.programTitle} has been added. Check the program details.`,
        url: `/employee/programs/${opts.programId}`,
        tag: `program-${opts.programId}`,
        data: { programId: opts.programId },
      }
    );
  }

/**
 * Notify when a new program is created.
 */
export async function notifyProgramCreated(opts: {
  adminUserId: string;
  programTitle: string;
  programId: string;
  eventDate: string;
}) {
  return createNotification({
    userId: opts.adminUserId,
    title: "New Program Scheduled",
    message: `Program "${opts.programTitle}" has been created for ${opts.eventDate}.`,
    type: "SUCCESS",
    link: `/admin/programs/${opts.programId}`,
  });
}

/**
 * Notify when an employee joins a program.
 */
export async function notifyEmployeeJoined(opts: {
  adminUserId: string;
  employeeName: string;
  programTitle: string;
  programId: string;
}) {
  return createNotification({
    userId: null, // broadcast
    title: "Employee Joined Program",
    message: `${opts.employeeName} has requested to join "${opts.programTitle}".`,
    type: "INFO",
    link: `/admin/programs/${opts.programId}`,
  });
}

/**
 * Notify when employee participation is confirmed.
 */
export async function notifyParticipationConfirmed(opts: {
  employeeUserId: string;
  programTitle: string;
  programId: string;
}) {
  return createNotification({
    userId: opts.employeeUserId,
    title: "Program Participation Confirmed",
    message: `Your participation in "${opts.programTitle}" has been confirmed.`,
    type: "SUCCESS",
    link: "/employee/my-programs",
  });
}

/**
 * Notify when an invoice is created.
 */
export async function notifyInvoiceCreated(opts: {
  adminUserId: string;
  invoiceNumber: string;
  customerName: string;
  grandTotal: number;
  invoiceId: string;
}) {
  return createNotification({
    userId: opts.adminUserId,
    title: "Invoice Issued",
    message: `Invoice ${opts.invoiceNumber} for ${opts.customerName} ($${opts.grandTotal.toFixed(2)}) has been created.`,
    type: "INFO",
    link: `/admin/invoices/${opts.invoiceId}`,
  });
}

/**
 * Notify when a payment is received on an invoice.
 */
export async function notifyPaymentReceived(opts: {
  adminUserId: string;
  customerName: string;
  amount: number;
  invoiceNumber: string;
  invoiceId: string;
}) {
  return createNotification({
    userId: opts.adminUserId,
    title: "Payment Received",
    message: `Payment of $${opts.amount.toFixed(2)} received from ${opts.customerName} for invoice ${opts.invoiceNumber}.`,
    type: "SUCCESS",
    link: `/admin/invoices/${opts.invoiceId}`,
  });
}

/**
 * Notify when a product goes below minimum stock.
 */
export async function notifyLowStock(opts: {
  productName: string;
  currentStock: number;
  minStock: number;
  unit: string;
  productId: string;
}) {
  return createNotification({
    userId: null, // broadcast
    title: "Low Stock Alert",
    message: `"${opts.productName}" is below minimum threshold: ${opts.currentStock} ${opts.unit} remaining (min: ${opts.minStock} ${opts.unit}).`,
    type: "WARNING",
    link: `/admin/products/${opts.productId}`,
  });
}

/**
 * Notify when an employee payment is approved/paid.
 */
export async function notifyEmployeePaymentPaid(opts: {
  employeeUserId: string;
  amount: number;
  paymentId: string;
}) {
  return createNotification({
    userId: opts.employeeUserId,
    title: "Payment Disbursed",
    message: `Your payment of $${opts.amount.toFixed(2)} has been processed and disbursed.`,
    type: "SUCCESS",
    link: `/employee/payments`,
  });
}
