import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { Prisma } from "@prisma/client";

/**
 * GET /api/settings
 * Returns the current business settings.
 * Accessible to authenticated Admin / Manager users.
 */
export async function GET() {
  try {
    await requireAdmin();

    const settings = await prisma.businessSettings.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        companyName: "Brilliant Catering & Events",
        tagline: "Premium Catering & Event Management Solutions",
        email: "",
        phone: "+91 7034510537",
        address: "Parappanangadi, malappuram, Kerala, India",
        city: "Parappanangadi",
        taxId: "TAX-99482710",
        currencySymbol: "₹",
        currencyCode: "INR",
        defaultTaxRate: new Prisma.Decimal("5.00"),
        invoicePrefix: "INV",
        receiptPrefix: "RCP",
        payoutPrefix: "PAY",
      },
    });

    return NextResponse.json({
      settings: {
        ...settings,
        defaultTaxRate: Number(settings.defaultTaxRate),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching business settings:", error);
    return NextResponse.json(
      { error: "Internal server error fetching settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Updates business settings.
 * Admin only. Generates an ActivityLog entry and sanitizes input.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const auditUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true },
    });
    const auditUserId = auditUser?.id ?? null;

    const {
      companyName,
      tagline,
      email,
      phone,
      address,
      city,
      taxId,
      currencySymbol,
      currencyCode,
      defaultTaxRate,
      invoicePrefix,
      receiptPrefix,
      payoutPrefix,
      termsAndConditions,
    } = body;

    // Validate required fields
    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }
    if (email?.trim() && !email.includes("@")) {
      return NextResponse.json(
        { error: "Business operations email must be valid when provided." },
        { status: 400 }
      );
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: "Business phone number is required." },
        { status: 400 }
      );
    }
    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: "Office/Warehouse address is required." },
        { status: 400 }
      );
    }

    const taxRateNum = parseFloat(String(defaultTaxRate ?? "0"));
    if (isNaN(taxRateNum) || taxRateNum < 0 || taxRateNum > 100) {
      return NextResponse.json(
        { error: "Default tax rate must be a valid percentage between 0 and 100." },
        { status: 400 }
      );
    }

    // Update settings in database
    const updated = await prisma.businessSettings.upsert({
      where: { id: "default" },
      update: {
        companyName: companyName.trim(),
        tagline: tagline ? tagline.trim() : null,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city ? city.trim() : "Parappanangadi",
        taxId: taxId ? taxId.trim() : null,
        currencySymbol: currencySymbol ? currencySymbol.trim() : "₹",
        currencyCode: currencyCode ? currencyCode.trim().toUpperCase() : "INR",
        defaultTaxRate: new Prisma.Decimal(taxRateNum.toFixed(2)),
        invoicePrefix: invoicePrefix ? invoicePrefix.trim().toUpperCase() : "INV",
        receiptPrefix: receiptPrefix ? receiptPrefix.trim().toUpperCase() : "RCP",
        payoutPrefix: payoutPrefix ? payoutPrefix.trim().toUpperCase() : "PAY",
        termsAndConditions: termsAndConditions ? termsAndConditions.trim() : null,
      },
      create: {
        id: "default",
        companyName: companyName.trim(),
        tagline: tagline ? tagline.trim() : null,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city ? city.trim() : "Parappanangadi",
        taxId: taxId ? taxId.trim() : null,
        currencySymbol: currencySymbol ? currencySymbol.trim() : "₹",
        currencyCode: currencyCode ? currencyCode.trim().toUpperCase() : "INR",
        defaultTaxRate: new Prisma.Decimal(taxRateNum.toFixed(2)),
        invoicePrefix: invoicePrefix ? invoicePrefix.trim().toUpperCase() : "INV",
        receiptPrefix: receiptPrefix ? receiptPrefix.trim().toUpperCase() : "RCP",
        payoutPrefix: payoutPrefix ? payoutPrefix.trim().toUpperCase() : "PAY",
        termsAndConditions: termsAndConditions ? termsAndConditions.trim() : null,
      },
    });

    // Audit trail logging: non-sensitive metadata only
    await prisma.activityLog.create({
      data: {
        userId: auditUserId,
        action: "BUSINESS_SETTINGS_UPDATED",
        entityType: "BusinessSettings",
        entityId: "default",
        details: {
          companyName: updated.companyName,
          currencyCode: updated.currencyCode,
          taxRate: Number(updated.defaultTaxRate),
          invoicePrefix: updated.invoicePrefix,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Business settings updated successfully",
      settings: {
        ...updated,
        defaultTaxRate: Number(updated.defaultTaxRate),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating business settings:", error);
    return NextResponse.json(
      { error: "Internal server error updating settings" },
      { status: 500 }
    );
  }
}
