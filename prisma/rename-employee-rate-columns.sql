ALTER TABLE "employee_types" RENAME COLUMN "defaultDailyRate" TO "defaultWagePerEvent";
ALTER TABLE "employees" RENAME COLUMN "dailyRate" TO "wagePerEvent";
