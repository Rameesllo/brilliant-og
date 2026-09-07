"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";

interface ProgramDetails {
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
  requiredStaffCount: number;
  notes: string;
  myParticipation: {
    status: string;
    assignedRole: string | null;
  } | null;
}

export default function EmployeeProgramDetailsPage() {
  const params = useParams<{ id: string }>();
  const [program, setProgram] = useState<ProgramDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/programs/${params.id}`)
      .then((response) => {
        if (!response.ok) throw new Error("Program not found");
        return response.json();
      })
      .then((data) => setProgram(data.program))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load program"));
  }, [params.id]);

  return (
    <EmployeeLayout
      title="Program Details"
      breadcrumbs={[{ label: "Employee Portal" }, { label: "All Programs", href: "/employee/programs" }, { label: "Details" }]}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/employee/programs">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            All Programs
          </Button>
        </Link>

        {error ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-red-600">{error}</CardContent>
          </Card>
        ) : !program ? (
          <Card><CardContent className="p-8"><LoadingState message="Loading program details..." /></CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="items-start">
              <div className="min-w-0">
                <p className="font-mono text-xs text-[#94A3B8]">{program.code}</p>
                <CardTitle className="mt-1 text-xl">{program.title}</CardTitle>
              </div>
              <Badge variant="orange" size="sm">{program.type}</Badge>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-lg bg-[#F8FAFC] p-3 text-sm">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                  <div><p className="text-xs text-[#64748B]">Date</p><p className="font-medium text-[#111827]">{formatDate(program.eventDate)}</p></div>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-[#F8FAFC] p-3 text-sm">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                  <div><p className="text-xs text-[#64748B]">Time</p><p className="font-medium text-[#111827]">{program.startTime} - {program.endTime}</p></div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] p-3 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                <div><p className="text-xs text-[#64748B]">Location</p><p className="font-medium text-[#111827]">{program.venueName}</p><p className="text-xs text-[#64748B]">{program.venueAddress}</p></div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-[#64748B]">
                <span>{program.expectedGuests} expected guests</span>
                <span>•</span>
                <span>{program.requiredStaffCount || "Staffing"} staff needed</span>
              </div>

              {program.myParticipation && (
                <div className="rounded-lg bg-[#FFF7ED] p-3 text-sm">
                  <p className="text-xs text-[#64748B]">Your participation</p>
                  <p className="font-medium text-[#C2410C]">{program.myParticipation.status.replace("_", " ")}{program.myParticipation.assignedRole ? ` · ${program.myParticipation.assignedRole}` : ""}</p>
                </div>
              )}

              {program.notes && <p className="rounded-lg border border-[#E5E7EB] p-3 text-sm text-[#475569]">{program.notes}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </EmployeeLayout>
  );
}