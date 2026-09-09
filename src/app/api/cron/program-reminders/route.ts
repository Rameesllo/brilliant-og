import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const REMINDER_TITLE = "Program Starting Soon";
const REMINDER_LOOKBACK_MS = 10 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function getProgramStart(eventDate: Date, startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;

  const datePart = eventDate.toISOString().slice(0, 10);
  const wallClock = new Date(`${datePart}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00.000Z`);
  if (Number.isNaN(wallClock.getTime())) return null;

  const timeZone = process.env.APP_TIME_ZONE || "Asia/Kolkata";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(wallClock);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const displayedAsUtc = Date.parse(
    `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}.000Z`
  );

  return new Date(wallClock.getTime() - (displayedAsUtc - wallClock.getTime()));
}

function formatProgramTime(start: Date) {
  return start.toLocaleTimeString("en-IN", {
    timeZone: process.env.APP_TIME_ZONE || "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const lookback = new Date(now.getTime() - TWO_HOURS_MS - REMINDER_LOOKBACK_MS);
  const lookahead = new Date(now.getTime() + TWO_HOURS_MS + 24 * 60 * 60 * 1000);
  const programs = await prisma.program.findMany({
    where: {
      status: { in: ["UPCOMING", "IN_PROGRESS"] },
      eventDate: { gte: lookback, lte: lookahead },
    },
    select: {
      id: true,
      title: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      venueName: true,
      venueAddress: true,
      expectedGuests: true,
      requiredStaffCount: true,
      programEmployees: {
        where: { status: "CONFIRMED" },
        select: {
          employee: {
            select: { userId: true },
          },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const program of programs) {
    const programStart = getProgramStart(program.eventDate, program.startTime);
    if (!programStart) continue;

    const reminderAt = new Date(programStart.getTime() - TWO_HOURS_MS);
    if (reminderAt > now || reminderAt < new Date(now.getTime() - REMINDER_LOOKBACK_MS)) continue;

    const eventDate = programStart.toLocaleDateString("en-IN", {
      timeZone: process.env.APP_TIME_ZONE || "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const message = `Your confirmed program, ${program.title}, starts on ${eventDate} at ${formatProgramTime(programStart)}. Be ready for the program. Venue: ${program.venueName}, ${program.venueAddress}. Expected guests: ${program.expectedGuests}. Required staff: ${program.requiredStaffCount}.`;

    for (const assignment of program.programEmployees) {
      if (!assignment.employee.userId) continue;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: assignment.employee.userId,
          title: REMINDER_TITLE,
          link: `/employee/programs/${program.id}`,
        },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await createNotification({
        userId: assignment.employee.userId,
        title: REMINDER_TITLE,
        message,
        type: "WARNING",
        link: `/employee/programs/${program.id}`,
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, checkedAt: now.toISOString() });
}
