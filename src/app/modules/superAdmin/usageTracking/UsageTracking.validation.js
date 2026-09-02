import { z } from "zod";

const createPerHourUsageTrackingValidationSchema = z.object({
  body: z.object({
    adminId: z.string().optional(),
    courseId: z.string().optional(),
    serviceId: z.string().optional(),
    hoursUsed: z.string().optional(),
    usageDate: z.string().optional(),
    priceId: z.string().optional(),
    quantity: z.number().nullable().optional(),
    unit: z.string().optional(),
    ratePerUnit: z.number().optional(),
    billingMonth: z.number().optional(),
    billingYear: z.number().optional(),
    isDefault: z.boolean().optional(),
  }),
});

// monthly bill generate
const createMonthlyBillGenerateValidationSchema = z.object({
  body: z.object({
    adminId: z.string(),
    year: z.number(),
    month: z.number(),
  }),
});

//update bill payment
const updateBillPaymentValidationSchema = z.object({
  body: z.object({
    paidAmount: z.number().positive("Paid amount must be a positive number"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    transactionId: z.string().min(1, "Transaction ID is required"),
    paymentDate: z.string().datetime().optional(),
  }),
});

export const UsageTrackingValidationSchema = {
  createPerHourUsageTrackingValidationSchema,
  createMonthlyBillGenerateValidationSchema,
  updateBillPaymentValidationSchema,
};
