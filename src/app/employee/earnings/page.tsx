"use client";

import React, { useState, useEffect } from "react";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DollarSign, Clock, AlertCircle, Loader2, CheckCircle, Receipt } from "lucide-react";

interface EarningsSummary {
  totalEarned: number;
  totalPaid: number;
  outstanding: number;
  pendingSettlement: number;
  hourlyRate: number;
  dailyRate: number;
  designation: string;
}

interface PayoutRecord {
  id: string;
  transactionNumber: string;
  referenceNo: string;
  programTitle: string;
  programCode: string;
  type: string;
  amount: number;
  paymentMethod: string | null;
  status: string;
  date: string;
  description: string;
}

export default function EmployeeEarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/employee/earnings")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load earnings summary");
        }
        return res.json();
      })
      .then((data) => {
        setSummary(data.summary || null);
        setPayouts(data.payouts || []);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load earnings summary");
        setIsLoading(false);
      });
  }, []);

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case "PAID":
      case "COMPLETED":
        return "paid";
      case "PENDING":
        return "pending";
      case "PARTIAL":
        return "partial";
      case "FAILED":
      case "CANCELLED":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <EmployeeLayout
      title="Staff Earnings & Payout Slips"
      breadcrumbs={[{ label: "Employee Portal" }, { label: "Earnings" }]}
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-3 text-sm text-[#991B1B]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-[#64748B] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
            <span className="text-sm font-medium">Loading payroll and earnings data...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#64748B]">Total Earned</span>
                    <DollarSign className="w-4 h-4 text-[#F97316]" />
                  </div>
                  <div className="text-2xl font-bold text-[#111827] mt-2">
                    {formatCurrency(summary?.totalEarned || 0)}
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">Gross shift wages recorded</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#64748B]">Total Paid (Disbursed)</span>
                    <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                  </div>
                  <div className="text-2xl font-bold text-[#15803D] mt-2">
                    {formatCurrency(summary?.totalPaid || 0)}
                  </div>
                  <p className="text-xs text-[#16A34A] mt-1">Cleared to bank account</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#64748B]">Outstanding Balance</span>
                    <Clock className="w-4 h-4 text-[#EA580C]" />
                  </div>
                  <div className="text-2xl font-bold text-[#EA580C] mt-2">
                    {formatCurrency(summary?.outstanding || 0)}
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">Pending next payroll cycle</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#64748B]">Base Wage Rate</span>
                    <Receipt className="w-4 h-4 text-[#6366F1]" />
                  </div>
                  <div className="text-xl font-bold text-[#111827] mt-2">
                    {summary?.hourlyRate ? `$${summary.hourlyRate.toFixed(2)}/hr` : summary?.dailyRate ? `$${summary.dailyRate.toFixed(2)}/day` : "Standard"}
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 truncate">{summary?.designation || "Active Staff"}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payout Disbursal History</CardTitle>
                <CardDescription>Official payout receipts and earnings statements</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                {payouts.length === 0 ? (
                  <div className="py-16 text-center text-[#64748B]">
                    <Receipt className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                    <p className="text-base font-semibold text-[#111827]">No payout disbursals yet</p>
                    <p className="text-sm mt-1">When payments are disbursed to you by management, records will be logged here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payout #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference / Memo</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Net Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-semibold text-xs text-[#111827]">
                            {p.transactionNumber}
                          </TableCell>
                          <TableCell className="text-xs text-[#64748B] whitespace-nowrap">
                            {formatDate(p.date)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-medium text-[#111827]">{p.description || "Wage Payout"}</div>
                            <span className="font-mono text-xs text-[#94A3B8]">Ref: {p.referenceNo}</span>
                          </TableCell>
                          <TableCell className="text-xs text-[#475569]">
                            {p.paymentMethod ? p.paymentMethod.replace("_", " ") : "Direct Transfer"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-[#15803D]">
                            {formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={getStatusBadgeVariant(p.status)} size="sm">
                              {p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </EmployeeLayout>
  );
}
