"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { type BadgeVariant } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  CreditCard,
  Building2,
  User,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
} from "lucide-react";

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  notes: string;
  terms: string;
  createdAt: string;
}
interface CustomerDetail {
  id: string;
  code: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
}
interface ProgramDetail {
  id: string;
  code: string;
  title: string;
  eventDate: string;
  venueName: string;
  venueAddress: string;
  expectedGuests: number;
}
interface InvoiceItem {
  id: string;
  productCode: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: string;
}
interface Payment {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNo: string;
  notes: string;
}
interface BusinessInfo {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  taxId: string;
}

function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "PAID": return "paid";
    case "OVERDUE": return "danger";
    case "PARTIAL": return "pending";
    case "CANCELLED": return "inactive";
    default: return "neutral";
  }
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "OTHER", label: "Other" },
];

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Record Payment modal
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Status update modal
  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invoice not found");
        return;
      }
      const data = await res.json();
      setInvoice(data.invoice);
      setCustomer(data.customer);
      setProgram(data.program);
      setItems(data.items);
      setPayments(data.payments);
      setBusiness(data.business);
      setNewStatus(data.invoice.status);
      if (data.invoice.outstandingAmount > 0) {
        setPaymentAmount(String(Math.round(data.invoice.outstandingAmount * 100) / 100));
      }
    } catch {
      setError("Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleRecordPayment = async () => {
    if (!invoice || !paymentAmount || Number(paymentAmount) <= 0) return;
    setIsSubmitting(true);
    try {
      // The customers payments endpoint handles payment recording
      const res = await fetch(`/api/customers/${customer?.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: Number(paymentAmount),
          paymentMethod,
          paymentDate,
          referenceNo: paymentRef,
          notes: paymentNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Failed to record payment");
        return;
      }
      showToast("success", `Payment of ${formatCurrency(Number(paymentAmount))} recorded successfully`);
      setPaymentOpen(false);
      fetchInvoice();
    } catch {
      showToast("error", "An error occurred recording payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!invoice || newStatus === invoice.status) {
      setStatusOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast("error", data.error || "Failed to update status");
        return;
      }
      showToast("success", "Invoice status updated");
      setStatusOpen(false);
      fetchInvoice();
    } catch {
      showToast("error", "Error updating status");
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showToast("error", data.error || "Cannot delete this invoice");
        return;
      }
      router.push("/admin/invoices");
    } catch {
      showToast("error", "Error deleting invoice");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Invoice" breadcrumbs={[{ label: "Admin Console" }, { label: "Invoices", href: "/admin/invoices" }, { label: "Loading..." }]}>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#F1F5F9] rounded-xl animate-pulse" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  if (error || !invoice || !customer) {
    return (
      <AdminLayout title="Invoice Not Found" breadcrumbs={[{ label: "Admin Console" }, { label: "Invoices", href: "/admin/invoices" }, { label: "Error" }]}>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="w-12 h-12 text-[#DC2626]" />
          <p className="text-sm font-medium text-[#475569]">{error || "Invoice not found"}</p>
          <Link href="/admin/invoices">
            <Button variant="secondary" size="sm">Back to Invoices</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const collectionPct = invoice.grandTotal > 0
    ? Math.min(100, Math.round((invoice.paidAmount / invoice.grandTotal) * 100))
    : 0;

  return (
    <AdminLayout
      title={`Invoice ${invoice.invoiceNumber}`}
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Invoices", href: "/admin/invoices" },
        { label: invoice.invoiceNumber },
      ]}
    >
      {/* Toast */}
      {toast && (
        <div className={`no-print mb-4 flex items-center gap-2 p-3.5 rounded-xl text-xs font-medium animate-in fade-in ${
          toast.type === "success"
            ? "bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D]"
            : "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
        }`}>
          {toast.type === "success"
            ? <CheckCircle2 className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Top action bar */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/invoices">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
            <Badge variant={statusBadgeVariant(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {invoice.outstandingAmount > 0 && invoice.status !== "CANCELLED" && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CreditCard className="w-4 h-4" />}
                onClick={() => setPaymentOpen(true)}
              >
                Record Payment
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit2 className="w-4 h-4 text-[#64748B]" />}
              onClick={() => setStatusOpen(true)}
            >
              Update Status
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Printer className="w-4 h-4 text-[#64748B]" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4 text-[#DC2626]" />}
              className="text-[#DC2626] hover:bg-[#FEF2F2]"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Collection Progress */}
        <div className="no-print bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="grid grid-cols-3 gap-6 flex-1">
              <div>
                <p className="text-xs text-[#64748B] font-medium">Total Amount</p>
                <p className="text-xl font-bold text-[#111827] mt-1">{formatCurrency(invoice.grandTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] font-medium">Amount Paid</p>
                <p className="text-xl font-bold text-[#16A34A] mt-1">{formatCurrency(invoice.paidAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] font-medium">Balance Due</p>
                <p className={`text-xl font-bold mt-1 ${invoice.outstandingAmount > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                  {formatCurrency(invoice.outstandingAmount)}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[#64748B] mb-1">
              <span>Collection progress</span>
              <span className="font-semibold">{collectionPct}%</span>
            </div>
            <div className="w-full bg-[#F1F5F9] rounded-full h-2">
              <div
                className="h-2 rounded-full bg-[#16A34A] transition-all duration-500"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="invoice-print-layout grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Invoice Print Area */}
          <div className="invoice-print-area lg:col-span-2 space-y-4">
            {/* Invoice header */}
            <Card className="invoice-document">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827]">{business?.companyName}</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">{business?.tagline}</p>
                    <div className="mt-2 text-xs text-[#475569] space-y-0.5">
                      <p>{business?.address}</p>
                      <p>{business?.city}</p>
                      <p>Tax ID: {business?.taxId}</p>
                      <p>{business?.email}</p>
                      <p>{business?.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-bold text-[#111827]">{invoice.invoiceNumber}</div>
                    <div className="mt-1.5 text-xs text-[#64748B] space-y-0.5">
                      <div className="flex justify-between gap-8">
                        <span>Issue Date:</span>
                        <span className="font-medium text-[#111827]">{formatDate(invoice.issueDate)}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span>Due Date:</span>
                        <span className={`font-medium ${invoice.outstandingAmount > 0 && new Date(invoice.dueDate) < new Date() ? "text-[#DC2626]" : "text-[#111827]"}`}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F1F5F9] mt-3 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bill To */}
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">
                      Bill To
                    </h4>
                    <p className="font-semibold text-[#111827]">{customer.name}</p>
                    {customer.companyName && (
                      <p className="text-xs text-[#64748B]">{customer.companyName}</p>
                    )}
                    <p className="text-xs text-[#64748B]">{customer.phone}</p>
                    {customer.email && <p className="text-xs text-[#64748B]">{customer.email}</p>}
                    {customer.address && (
                      <p className="text-xs text-[#64748B]">{customer.address}{customer.city ? `, ${customer.city}` : ""}</p>
                    )}
                  </div>
                  {/* Event */}
                  {program && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">
                        Event Details
                      </h4>
                      <p className="font-semibold text-[#111827]">{program.title}</p>
                      <p className="text-xs text-[#64748B] font-mono">{program.code}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-[#64748B]">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDate(program.eventDate)}</span>
                      </div>
                      {program.venueName && (
                        <div className="flex items-center gap-1 text-xs text-[#64748B]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{program.venueName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div className="mt-5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-[#E5E7EB]">
                        <th className="text-left py-2 font-semibold text-[#94A3B8] uppercase tracking-wider">Description</th>
                        <th className="text-center py-2 font-semibold text-[#94A3B8] uppercase tracking-wider">Qty</th>
                        <th className="text-right py-2 font-semibold text-[#94A3B8] uppercase tracking-wider">Unit Price</th>
                        <th className="text-right py-2 font-semibold text-[#94A3B8] uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-[#F1F5F9]">
                          <td className="py-2.5">
                            <div className="font-medium text-[#111827]">{item.description}</div>
                            <div className="text-[11px] text-[#94A3B8] font-mono">{item.productCode}</div>
                          </td>
                          <td className="py-2.5 text-center text-[#475569]">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 text-right text-[#475569]">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-[#111827]">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-4 flex justify-end">
                    <div className="w-full sm:w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#64748B]">
                        <span>Subtotal</span>
                        <span className="font-medium text-[#111827]">{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      {invoice.discount > 0 && (
                        <div className="flex justify-between text-[#64748B]">
                          <span>Discount</span>
                          <span className="font-medium text-[#16A34A]">-{formatCurrency(invoice.discount)}</span>
                        </div>
                      )}
                      {invoice.taxRate > 0 && (
                        <div className="flex justify-between text-[#64748B]">
                          <span>Tax ({invoice.taxRate}%)</span>
                          <span className="font-medium text-[#111827]">{formatCurrency(invoice.taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t-2 border-[#E5E7EB] pt-2 font-bold text-sm text-[#111827]">
                        <span>Grand Total</span>
                        <span>{formatCurrency(invoice.grandTotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#15803D]">
                        <span>Amount Paid</span>
                        <span className="font-medium">-{formatCurrency(invoice.paidAmount)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${invoice.outstandingAmount > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                        <span>Balance Due</span>
                        <span>{formatCurrency(invoice.outstandingAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes & Terms */}
                {(invoice.notes || invoice.terms) && (
                  <div className={`${!invoice.notes ? "no-print " : ""}mt-5 border-t border-[#F1F5F9] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#64748B]`}>
                    {invoice.notes && (
                      <div>
                        <span className="font-semibold text-[#94A3B8] uppercase tracking-wider text-[11px]">Notes</span>
                        <p className="mt-1">{invoice.notes}</p>
                      </div>
                    )}
                    {invoice.terms && (
                      <div className="no-print">
                        <span className="font-semibold text-[#94A3B8] uppercase tracking-wider text-[11px]">Terms & Conditions</span>
                        <p className="mt-1">{invoice.terms}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Sidebar */}
          <div className="no-print space-y-4">
            {/* Customer Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#6366F1]" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-xs space-y-2">
                <div>
                  <p className="font-semibold text-[#111827]">{customer.name}</p>
                  {customer.companyName && <p className="text-[#64748B]">{customer.companyName}</p>}
                  <p className="font-mono text-[#94A3B8] text-[11px]">{customer.code}</p>
                </div>
                <div className="space-y-1 text-[#64748B]">
                  {customer.phone && <p>📞 {customer.phone}</p>}
                  {customer.email && <p>✉️ {customer.email}</p>}
                  {customer.city && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>{customer.city}</span>
                    </div>
                  )}
                </div>
                <Link href={`/admin/customers?id=${customer.id}`}>
                  <Button variant="ghost" size="sm" className="w-full h-7 text-xs mt-1">
                    View Profile →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#16A34A]" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {payments.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] text-center py-4">No payments recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((pmt) => (
                      <div key={pmt.id} className="flex flex-col gap-0.5 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#16A34A]">{formatCurrency(pmt.amount)}</span>
                          <span className="text-[11px] text-[#94A3B8]">{formatDate(pmt.paymentDate)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#64748B]">{pmt.paymentMethod}</span>
                          {pmt.receiptNumber && (
                            <span className="text-[11px] font-mono text-[#94A3B8]">{pmt.receiptNumber}</span>
                          )}
                        </div>
                        {pmt.referenceNo && (
                          <span className="text-[11px] text-[#94A3B8]">Ref: {pmt.referenceNo}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {invoice.outstandingAmount > 0 && invoice.status !== "CANCELLED" && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setPaymentOpen(true)}
                  >
                    + Record Payment
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Record Payment"
        description={`Record a payment received for invoice ${invoice?.invoiceNumber}. Outstanding balance: ${formatCurrency(invoice?.outstandingAmount || 0)}`}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPaymentOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRecordPayment}
              isLoading={isSubmitting}
              disabled={!paymentAmount || Number(paymentAmount) <= 0}
            >
              Record Payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              isRequired
              type="number"
              min="0.01"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Payment Date"
              isRequired
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={PAYMENT_METHODS}
          />
          <Input
            label="Reference / Cheque No."
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="Transaction or cheque reference"
          />
          <Input
            label="Notes"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="Optional payment notes"
          />
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Update Invoice Status"
        description="Manually override the invoice payment status."
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpdateStatus}>
              Update Status
            </Button>
          </>
        }
      >
        <Select
          label="New Status"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          options={[
            { value: "UNPAID", label: "Unpaid" },
            { value: "PARTIAL", label: "Partial" },
            { value: "PAID", label: "Paid" },
            { value: "OVERDUE", label: "Overdue" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
      </Modal>
    </AdminLayout>
  );
}
