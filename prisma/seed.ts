import { PrismaClient, Role, EmployeeStatus, ProgramType, ProgramStatus, ProgramEmployeeStatus, ProductType, LedgerEntryType, PaymentStatus, InvoicePaymentStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Catering & Event ERP database...");

  // 1. Business Settings
  await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: {
      companyName: "Brilliant Catering & Events",
      tagline: "Premium Catering & Event Management Solutions",
      email: "",
      phone: "+91 7034510537",
      address: "Parappanangadi, malappuram, Kerala, India",
      city: "Parappanangadi",
    },
    create: {
      id: "default",
      companyName: "Brilliant Catering & Events",
      tagline: "Premium Catering & Event Management Solutions",
      email: "",
      phone: "+91 7034510537",
      address: "Parappanangadi, malappuram, Kerala, India",
      city: "Parappanangadi",
      currencySymbol: "₹",
      currencyCode: "INR",
      defaultTaxRate: 5.0,
      invoicePrefix: "INV-2026",
      receiptPrefix: "RCP-2026",
      payoutPrefix: "PAY-2026",
    },
  });
  console.log("✓ Business Settings initialized");

  // Generate password hashes for users
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const employeePasswordHash = await bcrypt.hash("employee123", 10);

  // 2. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "victoria@royalheritage.com" },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: "victoria@royalheritage.com",
      passwordHash: adminPasswordHash,
      name: "Victoria Sterling",
      role: Role.ADMIN,
      phone: "+1 (555) 019-2831",
    },
  });
  console.log("✓ Admin User initialized:", adminUser.email);

  // 3. Employee Types (Wages per work/event — NOT hourly, NOT daily)
  const supervisorType = await prisma.employeeType.upsert({
    where: { name: "Supervisor" },
    update: { defaultWagePerEvent: 1500.0 },
    create: {
      name: "Supervisor",
      description: "Event & Operations Supervisor",
      defaultWagePerEvent: 1500.0,
    },
  });

  const serviceBoyType = await prisma.employeeType.upsert({
    where: { name: "Service Boy" },
    update: { defaultWagePerEvent: 700.0 },
    create: {
      name: "Service Boy",
      description: "Banquet & Table Service Staff",
      defaultWagePerEvent: 700.0,
    },
  });

  const baseBoyType = await prisma.employeeType.upsert({
    where: { name: "Base Boy" },
    update: { defaultWagePerEvent: 600.0 },
    create: {
      name: "Base Boy",
      description: "Kitchen Base & Setup Operations Staff",
      defaultWagePerEvent: 600.0,
    },
  });

  const captainType = await prisma.employeeType.upsert({
    where: { name: "Captain" },
    update: { defaultWagePerEvent: 1200.0 },
    create: {
      name: "Captain",
      description: "Floor & Service Section Captain",
      defaultWagePerEvent: 1200.0,
    },
  });

  const hostingBoyType = await prisma.employeeType.upsert({
    where: { name: "Hosting Boy" },
    update: { defaultWagePerEvent: 900.0 },
    create: {
      name: "Hosting Boy",
      description: "Front-of-House Guest Host (Male)",
      defaultWagePerEvent: 900.0,
    },
  });

  const hostingGirlType = await prisma.employeeType.upsert({
    where: { name: "Hosting Girl" },
    update: { defaultWagePerEvent: 900.0 },
    create: {
      name: "Hosting Girl",
      description: "Front-of-House Guest Host (Female)",
      defaultWagePerEvent: 900.0,
    },
  });

  const managerType = await prisma.employeeType.upsert({
    where: { name: "Manager" },
    update: { defaultWagePerEvent: 2000.0 },
    create: {
      name: "Manager",
      description: "Event General & Operations Manager",
      defaultWagePerEvent: 2000.0,
    },
  });
  console.log("✓ Employee Types initialized (Supervisor, Service Boy, Base Boy, Captain, Hosting Boy, Hosting Girl, Manager)");

  // 4. Employee User & Employee Profile (Marcus Vance)
  const marcusUser = await prisma.user.upsert({
    where: { email: "marcus.vance@royalheritage.com" },
    update: { passwordHash: employeePasswordHash },
    create: {
      email: "marcus.vance@royalheritage.com",
      passwordHash: employeePasswordHash,
      name: "Marcus Vance",
      role: Role.EMPLOYEE,
      phone: "+1 (555) 321-7890",
    },
  });

  const marcusEmp = await prisma.employee.upsert({
    where: { code: "EMP-101" },
    update: { userId: marcusUser.id, employeeTypeId: supervisorType.id, wagePerEvent: 1500.0 },
    create: {
      code: "EMP-101",
      userId: marcusUser.id,
      employeeTypeId: supervisorType.id,
      name: "Marcus Vance",
      phone: "+1 (555) 321-7890",
      email: "marcus.vance@royalheritage.com",
      address: "742 Evergreen Terrace, Springfield",
      emergencyContact: "Sarah Vance (Spouse) - +1 (555) 998-1122",
      wagePerEvent: 1500.0,
      status: EmployeeStatus.ACTIVE,
    },
  });

  // Additional Employees
  const elenaEmp = await prisma.employee.upsert({
    where: { code: "EMP-102" },
    update: { employeeTypeId: captainType.id, wagePerEvent: 1200.0 },
    create: {
      code: "EMP-102",
      employeeTypeId: captainType.id,
      name: "Elena Rostova",
      phone: "+1 (555) 432-8901",
      email: "elena.r@royalheritage.com",
      wagePerEvent: 1200.0,
      status: EmployeeStatus.ACTIVE,
    },
  });

  await prisma.employee.upsert({
    where: { code: "EMP-103" },
    update: { employeeTypeId: serviceBoyType.id, wagePerEvent: 700.0 },
    create: {
      code: "EMP-103",
      employeeTypeId: serviceBoyType.id,
      name: "Tariq Mansoor",
      phone: "+1 (555) 543-9012",
      email: "tariq.m@royalheritage.com",
      wagePerEvent: 700.0,
      status: EmployeeStatus.ACTIVE,
    },
  });

  await prisma.employee.upsert({
    where: { code: "EMP-104" },
    update: { employeeTypeId: baseBoyType.id, wagePerEvent: 600.0 },
    create: {
      code: "EMP-104",
      employeeTypeId: baseBoyType.id,
      name: "David Kim",
      phone: "+1 (555) 654-0123",
      email: "david.k@royalheritage.com",
      wagePerEvent: 600.0,
      status: EmployeeStatus.ACTIVE,
    },
  });
  console.log("✓ Employees initialized (Marcus, Elena, Tariq, David)");

  // 5. Product Categories
  const catStarters = await prisma.productCategory.upsert({
    where: { name: "Starters & Appetizers" },
    update: {},
    create: { name: "Starters & Appetizers", type: ProductType.CATERING_FOOD },
  });

  const catMains = await prisma.productCategory.upsert({
    where: { name: "Main Course & Curries" },
    update: {},
    create: { name: "Main Course & Curries", type: ProductType.CATERING_FOOD },
  });

  const catChafing = await prisma.productCategory.upsert({
    where: { name: "Chafing Dishes & Warmers" },
    update: {},
    create: { name: "Chafing Dishes & Warmers", type: ProductType.RENTAL_EQUIPMENT },
  });

  const catLinens = await prisma.productCategory.upsert({
    where: { name: "Table Linens & Furniture" },
    update: {},
    create: { name: "Table Linens & Furniture", type: ProductType.RENTAL_EQUIPMENT },
  });
  console.log("✓ Product Categories initialized");

  // 6. Products
  await prisma.product.upsert({
    where: { code: "PRD-CAT-001" },
    update: {},
    create: {
      code: "PRD-CAT-001",
      name: "Royal Paneer Tikka Live Counter",
      categoryId: catStarters.id,
      type: ProductType.CATERING_FOOD,
      unit: "plate",
      sellingPrice: 120.0,
      costPrice: 55.0,
      stockQuantity: 500,
      minStockAlert: 50,
      description: "Live tandoori cottage cheese skewers marinated in royal spices",
    },
  });

  await prisma.product.upsert({
    where: { code: "PRD-CAT-002" },
    update: {},
    create: {
      code: "PRD-CAT-002",
      name: "Hyderabadi Dum Biryani Feast",
      categoryId: catMains.id,
      type: ProductType.CATERING_FOOD,
      unit: "plate",
      sellingPrice: 280.0,
      costPrice: 120.0,
      stockQuantity: 450,
      minStockAlert: 40,
      description: "Slow-cooked saffron basmati rice with marinated tender cuts and spices",
    },
  });

  await prisma.product.upsert({
    where: { code: "PRD-RNT-001" },
    update: {},
    create: {
      code: "PRD-RNT-001",
      name: "Roll-Top Stainless Steel Chafing Dish 9L",
      categoryId: catChafing.id,
      type: ProductType.RENTAL_EQUIPMENT,
      unit: "set",
      sellingPrice: 35.0,
      costPrice: 12.0,
      stockQuantity: 4,
      minStockAlert: 10,
      description: "Premium heavy-gauge mirror-finish roll-top chafing server with fuel holders",
    },
  });

  await prisma.product.upsert({
    where: { code: "PRD-RNT-002" },
    update: {},
    create: {
      code: "PRD-RNT-002",
      name: "Royal Gold Jacquard Table Linens 120\"",
      categoryId: catLinens.id,
      type: ProductType.RENTAL_EQUIPMENT,
      unit: "piece",
      sellingPrice: 18.0,
      costPrice: 5.0,
      stockQuantity: 6,
      minStockAlert: 15,
      description: "Rich damask jacquard pattern round banquet tablecloths",
    },
  });
  console.log("✓ Products initialized");

  // 7. Customers
  const custRajesh = await prisma.customer.upsert({
    where: { code: "CUST-1001" },
    update: {},
    create: {
      code: "CUST-1001",
      name: "Rajesh Malhotra",
      companyName: "Malhotra Diamond Exports",
      phone: "+1 (555) 432-8871",
      email: "rajesh@malhotradiamonds.com",
      city: "Metropolis",
      address: "12 Grand Park Crescent",
    },
  });

  const custSarah = await prisma.customer.upsert({
    where: { code: "CUST-1002" },
    update: {},
    create: {
      code: "CUST-1002",
      name: "Sarah Jenkins",
      companyName: "Apex FinTech Solutions",
      phone: "+1 (555) 789-2234",
      email: "events@apexfintech.io",
      city: "Metropolis",
      address: "100 Financial Center Blvd, 14th Floor",
    },
  });

  await prisma.customer.upsert({
    where: { code: "CUST-1003" },
    update: {},
    create: {
      code: "CUST-1003",
      name: "Deepak Sharma",
      phone: "+1 (555) 654-1928",
      email: "deepak.sharma@gmail.com",
      city: "Metropolis",
      address: "88 Orchid Meadows",
    },
  });
  console.log("✓ Customers initialized (Rajesh, Sarah, Deepak)");

  // 8. Programs (Events)
  const today = new Date();
  const dateEvent1 = new Date(today);
  dateEvent1.setHours(18, 0, 0, 0);

  const dateEvent2 = new Date(today);
  dateEvent2.setDate(dateEvent2.getDate() + 2);
  dateEvent2.setHours(19, 0, 0, 0);

  const prog1 = await prisma.program.upsert({
    where: { code: "EVT-2026-101" },
    update: {},
    create: {
      code: "EVT-2026-101",
      title: "Kapoor & Malhotra Royal Wedding Reception",
      type: ProgramType.WEDDING,
      status: ProgramStatus.UPCOMING,
      customerId: custRajesh.id,
      eventDate: dateEvent1,
      startTime: "18:00",
      endTime: "23:30",
      venueName: "Grand Ballroom, Marriott Luxury Suites",
      venueAddress: "77 Luxury Way, Metropolis",
      expectedGuests: 450,
      requiredStaffCount: 20,
      budget: 28500.0,
      notes: "Grand 5-course royal banquet, live chaat and tandoor counters, cocktail lounge",
    },
  });

  const prog2 = await prisma.program.upsert({
    where: { code: "EVT-2026-102" },
    update: {},
    create: {
      code: "EVT-2026-102",
      title: "Apex FinTech Annual Gala Dinner",
      type: ProgramType.CORPORATE,
      status: ProgramStatus.UPCOMING,
      customerId: custSarah.id,
      eventDate: dateEvent2,
      startTime: "19:00",
      endTime: "22:00",
      venueName: "Skyline Terrace & Lounge, Downtown",
      venueAddress: "300 Skyline Parkway, Penthouse Suite",
      expectedGuests: 180,
      requiredStaffCount: 12,
      budget: 14200.0,
      notes: "Corporate awards night with passed hors d'oeuvres and plated three-course dinner",
    },
  });
  console.log("✓ Programs initialized (Wedding Reception, Corporate Gala)");

  // 9. Program Employee Assignments
  await prisma.programEmployee.upsert({
    where: {
      programId_employeeId: {
        programId: prog1.id,
        employeeId: marcusEmp.id,
      },
    },
    update: {},
    create: {
      programId: prog1.id,
      employeeId: marcusEmp.id,
      status: ProgramEmployeeStatus.CONFIRMED,
      assignedRole: "Head Chef / Kitchen Lead",
    },
  });

  await prisma.programEmployee.upsert({
    where: {
      programId_employeeId: {
        programId: prog1.id,
        employeeId: elenaEmp.id,
      },
    },
    update: {},
    create: {
      programId: prog1.id,
      employeeId: elenaEmp.id,
      status: ProgramEmployeeStatus.CONFIRMED,
      assignedRole: "Service Captain",
    },
  });

  await prisma.programEmployee.upsert({
    where: {
      programId_employeeId: {
        programId: prog2.id,
        employeeId: marcusEmp.id,
      },
    },
    update: {},
    create: {
      programId: prog2.id,
      employeeId: marcusEmp.id,
      status: ProgramEmployeeStatus.CONFIRMED,
      assignedRole: "Senior Culinary Lead",
    },
  });
  console.log("✓ Program Employee assignments created");

  // 10. Sample Employee Payment (Credit earning & Pending payout)
  await prisma.employeePayment.upsert({
    where: { transactionNumber: "TXN-EMP-2026-0001" },
    update: { amount: 1500.0, description: "Event wages for Wedding Program (1 Event @ ₹1,500/event)" },
    create: {
      transactionNumber: "TXN-EMP-2026-0001",
      employeeId: marcusEmp.id,
      programId: prog1.id,
      type: LedgerEntryType.CREDIT,
      amount: 1500.0,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.PENDING,
      description: "Event wages for Wedding Program (1 Event @ ₹1,500/event)",
    },
  });

  // 11. Sample Invoice
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 14);

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-2026-0042" },
    update: {},
    create: {
      invoiceNumber: "INV-2026-0042",
      customerId: custRajesh.id,
      programId: prog1.id,
      issueDate: today,
      dueDate: dueDate,
      subtotal: 25000.0,
      taxRate: 5.0,
      taxAmount: 1250.0,
      discount: 0.0,
      grandTotal: 26250.0,
      paidAmount: 10000.0,
      outstandingAmount: 16250.0,
      status: InvoicePaymentStatus.PARTIAL,
      notes: "Advance ₹10,000 received; balance due 3 days prior to wedding",
    },
  });
  console.log("✓ Sample Invoice and Employee Payments initialized");

  console.log("Full seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
