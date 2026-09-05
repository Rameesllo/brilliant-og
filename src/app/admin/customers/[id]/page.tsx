"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit,
  DollarSign,
  Receipt,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  PlusCircle,
  X,
} from "lucide-react";

interface CustomerDetails {
  id: string;
  code: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Financials {
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueCount: number;
  status: "PAID" | "PENDING" | "OVERDUE";
}

interface ProgramRecord {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  expectedGuests: number;
  budget: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  notes: string;
}

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNo: string;
  notes: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const customerId = unwrappedParams.id;

  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [activeTab, setActiveTab] = useState<"programs" | "invoices" | "payments" | "info">("programs");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNo: "",
    invoiceId: "",
    notes: "",
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState<string | null>(null);

  const fetchCustomerData = useCallback(() => {
    fetch(`/api/customers/${customerId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load customer profile");
        return res.json();
      })
      .then((data) => {
        setCustomer(data.customer || null);
        setFinancials(data.financials || null);
        setPrograms(data.programs || []);
        setInvoices(data.invoices || []);
        setPayments(data.payments || []);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "An unexpected error occurred");
        setIsLoading(false);
      });
  }, [customerId]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentModalError(null);

    const numAmount = Number(paymentForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPaymentModalError("Please enter a valid positive payment amount");
      return;
    }

    setIsSubmittingPayment(true);

    try {
      const res = await fetch(`/api/customers/${customerId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod: paymentForm.paymentMethod,
          paymentDate: paymentForm.paymentDate,
          referenceNo: paymentForm.referenceNo,
          invoiceId: paymentForm.invoiceId || null,
          notes: paymentForm.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      setIsPaymentModalOpen(false);
      setPaymentForm({
        amount: "",
        paymentMethod: "BANK_TRANSFER",
        paymentDate: new Date().toISOString().split("T")[0],
        referenceNo: "",
        invoiceId: "",
        notes: "",
      });
      fetchCustomerData();
    } catch (err: unknown) {
      setPaymentModalError(err instanceof Error ? err.message : "Payment recording failed");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const getInvoiceBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case "PAID":
        return "paid";
      case "PARTIAL":
        return "partial";
      case "OVERDUE":
        return "danger";
      case "UNPAID":
        return "warning";
      default:
        return "neutral";
    }
  };

  const getProgramBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case "COMPLETED":
        return "completed";
      case "IN_PROGRESS":
        return "active";
      case "UPCOMING":
        return "pending";
      case "CANCELLED":
        return "cancelled";
      default:
        return "neutral";
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Customer Profile & Ledger"
        breadcrumbs={[{ label: "Admin Console" }, { label: "Customers", href: "/admin/customers" }]}
      >
        <div className="py-24 flex flex-col items-center justify-center text-[#64748B] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
          <span className="text-sm font-medium">Loading customer account and financial ledger...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout
        title="Customer Not Found"
        breadcrumbs={[{ label: "Admin Console" }, { label: "Customers", href: "/admin/customers" }]}
      >
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#DC2626] mx-auto" />
          <h2 className="text-xl font-bold text-[#111827]">Customer Not Found</h2>
          <p className="text-sm text-[#64748B]">The requested customer account does not exist or may have been deleted.</p>
          <Link href="/admin/customers">
            <Button variant="primary" size="sm">Back to Customer Directory</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`${customer.name} — Customer Profile`}
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Customers", href: "/admin/customers" },
        { label: customer.name },
      ]}
    >
      <div className="space-y-6">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/customers">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Customers
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#F97316] border border-[#FFEDD5]">
                {customer.code}
              </span>
              <Badge variant={customer.isActive ? "active" : "inactive"} size="sm">
                {customer.isActive ? "Active Client" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4 text-[#16A34A]" />}
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Record Payment
            </Button>
            <Link href={`/admin/customers/${customer.id}/edit`}>
              <Button variant="primary" size="sm" leftIcon={<Edit className="w-4 h-4" />}>
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-3 text-sm text-[#991B1B]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#111827]">{customer.name}</h1>
                  {customer.companyName && (
                    <div className="flex items-center gap-1.5 text-sm text-[#475569] font-medium bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
                      <Building className="w-4 h-4 text-[#94A3B8]" />
                      <span>{customer.companyName}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span className="font-medium text-[#111827]">{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>{customer.city}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Client since {formatDate(customer.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Total Billed</span>
                <DollarSign className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">
                {formatCurrency(financials?.totalBilled || 0)}
              </div>
              <p className="text-xs text-[#64748B] mt-1">{invoices.length} invoices generated</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Total Received</span>
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="text-2xl font-bold text-[#15803D] mt-2">
                {formatCurrency(financials?.totalPaid || 0)}
              </div>
              <p className="text-xs text-[#16A34A] mt-1">{payments.length} payment receipts logged</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Outstanding Balance</span>
                <Clock className="w-4 h-4 text-[#EA580C]" />
              </div>
              <div className={`text-2xl font-bold mt-2 ${financials?.outstandingBalance && financials.outstandingBalance > 0 ? "text-[#DC2626]" : "text-[#15803D]"}`}>
                {formatCurrency(financials?.outstandingBalance || 0)}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Net pending receivables</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Booked Programs</span>
                <Calendar className="w-4 h-4 text-[#F97316]" />
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">
                {programs.length}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Catering & banqueting events</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E2E8F0] gap-8 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("programs")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "programs"
                ? "border-[#F97316] text-[#F97316] font-semibold"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            Event Programs ({programs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "invoices"
                ? "border-[#F97316] text-[#F97316] font-semibold"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "payments"
                ? "border-[#F97316] text-[#F97316] font-semibold"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            Payment Receipts ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-[#F97316] text-[#F97316] font-semibold"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            Account Details & Notes
          </button>
        </div>

        {/* Tab 1: Event Programs */}
        {activeTab === "programs" && (
          <Card>
            <CardHeader>
              <CardTitle>Booked Catering Programs</CardTitle>
              <CardDescription>Catering events, wedding banquets, and corporate functions for this client</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              {programs.length === 0 ? (
                <div className="py-16 text-center text-[#64748B]">
                  <Calendar className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                  <p className="text-base font-semibold text-[#111827]">No programs booked yet</p>
                  <p className="text-sm mt-1">Catering events organized for this client will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Program</TableHead>
                      <TableHead>Event Date</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead className="text-center">Guests</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((prog) => (
                      <TableRow key={prog.id}>
                        <TableCell>
                          <div className="font-semibold text-[#111827]">{prog.title}</div>
                          <span className="font-mono text-xs text-[#F97316]">{prog.code}</span>
                        </TableCell>
                        <TableCell className="text-xs text-[#111827] whitespace-nowrap">
                          {formatDate(prog.eventDate)}
                          <div className="text-[#64748B]">{prog.startTime} - {prog.endTime}</div>
                        </TableCell>
                        <TableCell className="text-xs text-[#64748B]">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>{prog.venueName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium text-xs text-[#111827]">
                          {prog.expectedGuests}
                        </TableCell>
                        <TableCell className="text-right font-medium text-[#111827]">
                          {formatCurrency(prog.budget)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getProgramBadgeVariant(prog.status)} size="sm">
                            {prog.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/programs/${prog.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              View Event
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        )}

        {/* Tab 2: Invoices */}
        {activeTab === "invoices" && (
          <Card>
            <CardHeader>
              <CardTitle>Invoices & Billings</CardTitle>
              <CardDescription>Billed invoice statements and payment tracking</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              {invoices.length === 0 ? (
                <div className="py-16 text-center text-[#64748B]">
                  <Receipt className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                  <p className="text-base font-semibold text-[#111827]">No invoices generated yet</p>
                  <p className="text-sm mt-1">Invoices issued to this client will be recorded here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                      <TableHead className="text-right">Paid Amount</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-semibold text-xs text-[#111827]">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs text-[#64748B]">
                          {formatDate(inv.issueDate)}
                        </TableCell>
                        <TableCell className="text-xs text-[#64748B]">
                          {formatDate(inv.dueDate)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-[#111827]">
                          {formatCurrency(inv.grandTotal)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-[#15803D] font-medium">
                          {formatCurrency(inv.paidAmount)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#DC2626]">
                          {formatCurrency(inv.outstandingAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getInvoiceBadgeVariant(inv.status)} size="sm">
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        )}

        {/* Tab 3: Payment Receipts */}
        {activeTab === "payments" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer Payment Receipts</CardTitle>
                  <CardDescription>Cleared payments, bank transfers, and receipts</CardDescription>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  Record Payment
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              {payments.length === 0 ? (
                <div className="py-16 text-center text-[#64748B]">
                  <Receipt className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                  <p className="text-base font-semibold text-[#111827]">No payment receipts logged yet</p>
                  <p className="text-sm mt-1">Record client deposits or invoice settlements.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference / UTR</TableHead>
                      <TableHead>Linked Invoice</TableHead>
                      <TableHead className="text-right">Amount Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((pmt) => (
                      <TableRow key={pmt.id}>
                        <TableCell className="font-mono font-semibold text-xs text-[#111827]">
                          {pmt.receiptNumber}
                        </TableCell>
                        <TableCell className="text-xs text-[#64748B]">
                          {formatDate(pmt.paymentDate)}
                        </TableCell>
                        <TableCell className="text-xs text-[#475569]">
                          {pmt.paymentMethod.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-[#64748B]">
                          {pmt.referenceNo || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-[#F97316] font-mono">
                          {pmt.invoiceNumber || "General Deposit"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#15803D]">
                          {formatCurrency(pmt.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        )}

        {/* Tab 4: Contact & Preferences */}
        {activeTab === "info" && (
          <Card>
            <CardHeader>
              <CardTitle>Account Details & Preferences</CardTitle>
              <CardDescription>Billing address, regional details, and special client preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-medium text-[#64748B]">Billing & Event Address</span>
                  <p className="text-sm font-medium text-[#111827] mt-1">
                    {customer.address || "No physical address specified"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-[#64748B]">City / State / Region</span>
                  <p className="text-sm font-medium text-[#111827] mt-1">
                    {customer.city || "Not specified"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-medium text-[#64748B]">Catering Notes & Dietary Specifications</span>
                  <div className="mt-1 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#334155] whitespace-pre-wrap">
                    {customer.notes || "No special dietary instructions or catering notes provided."}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#16A34A]" />
                <h3 className="text-base font-bold text-[#111827]">Record Payment Receipt</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#111827] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="p-6 space-y-4">
                {paymentModalError && (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#DC2626]">
                    {paymentModalError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Payment Amount ($) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                      Payment Method
                    </label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                      Receipt Date
                    </label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, referenceNo: e.target.value }))}
                    placeholder="e.g. UTR-982341 or Check #402"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                  />
                </div>

                {invoices.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                      Apply to Invoice (Optional)
                    </label>
                    <select
                      value={paymentForm.invoiceId}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, invoiceId: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                    >
                      <option value="">-- General Deposit / Advance --</option>
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — Outstanding: {formatCurrency(inv.outstandingAmount)} ({inv.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Memo / Notes
                  </label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. 50% banquet deposit cleared"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSubmittingPayment}
                  leftIcon={isSubmittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                >
                  {isSubmittingPayment ? "Recording Receipt..." : "Save Payment Receipt"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
