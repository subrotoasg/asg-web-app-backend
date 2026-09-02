import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";

const ONE_TIME_PRICE_TYPES = new Set(["FIXED", "ONE_TIME"]);
const YEARLY_PRICE_TYPES = new Set(["YEARLY"]);
const MONTHLY_PRICE_TYPES = new Set(["MONTHLY"]);
const ADDITIVE_PRICE_TYPES = new Set([
  "PER_HOUR",
  "PER_MINUTE",
  "PER_MB",
  "PER_GB",
  "PER_TB",
  "BANDWIDTH",
  "PER_STUDENT",
  "PER_CLASS",
  "PER_COURSE",
  "PER_USER",
  "PER_API_CALL",
  "CUSTOM",
]);

class UsageTrackingService {
  async _checkDuplicate({
    adminId,
    courseId,
    serviceId,
    priceType,
    billingYear,
    billingMonth,
  }) {
    return prisma.serviceUsageLog.findFirst({
      where: {
        adminId,
        courseId,
        serviceId,
        priceType,
        isDeleted: false,
        ...(billingYear !== undefined && { billingYear }),
        ...(billingMonth !== undefined && { billingMonth }),
      },
    });
  }

  // PER_HOUR / PER_MINUTE
  async trackHourlyUsage(data) {
    const {
      courseId,
      adminId,
      serviceId,
      offeringPriceId,
      defaultServicePriceId,
      hours,
      ratePerHour,
      date,
      isDefault,
    } = data;

    if (!hours || hours <= 0)
      throw new AppErrors(400, "Hours must be greater than 0");
    if (!ratePerHour || Number(ratePerHour) < 0)
      throw new AppErrors(400, "Invalid rate per hour");

    const totalAmount = parseFloat((hours * Number(ratePerHour)).toFixed(10));
    const usageDate = new Date(date);
    const billingMonth = usageDate.getMonth() + 1;
    const billingYear = usageDate.getFullYear();

    const usage = await prisma.serviceUsageLog.create({
      data: {
        courseId,
        adminId,
        serviceId,
        offeringPriceId: isDefault ? null : offeringPriceId,
        defaultServicePriceId: isDefault ? defaultServicePriceId : null,
        priceType: "PER_HOUR",
        quantity: hours,
        unit: "HOUR",
        ratePerUnit: ratePerHour,
        totalAmount,
        currency: "BDT",
        usageDate,
        billingMonth,
        billingYear,
        startTime: usageDate,
        endTime: new Date(usageDate.getTime() + hours * 3600 * 1000),
        referenceType: "CLASS",
        metadata: { hours },
        status: "ACTIVE",
        isBillable: true,
      },
    });

    await this.updateCourseSummary(
      courseId,
      adminId,
      serviceId,
      null,
      billingYear,
      billingMonth,
    );
    return usage;
  }

  // PER_MB / PER_GB / PER_TB / BANDWIDTH
  async trackStorageUsage(data) {
    const {
      adminId,
      courseId,
      serviceId,
      offeringPriceId,
      defaultServicePriceId,
      quantity,
      unit,
      ratePerUnit,
      fileId,
      fileName,
      fileType,
      date,
      isDefault,
    } = data;

    let sizeInGB = Number(quantity);
    if (!sizeInGB || isNaN(sizeInGB) || sizeInGB <= 0)
      throw new AppErrors(400, "Storage quantity must be > 0");

    // Normalize to GB for uniform storage
    if (unit === "PER_MB") sizeInGB = sizeInGB / 1024;
    else if (unit === "PER_TB") sizeInGB = sizeInGB * 1024;

    const totalAmount = parseFloat(
      (sizeInGB * Number(ratePerUnit)).toFixed(10),
    );
    const usageDate = new Date(date);
    const billingMonth = usageDate.getMonth() + 1;
    const billingYear = usageDate.getFullYear();

    const usage = await prisma.serviceUsageLog.create({
      data: {
        courseId,
        adminId,
        serviceId,
        offeringPriceId: isDefault ? null : offeringPriceId,
        defaultServicePriceId: isDefault ? defaultServicePriceId : null,
        priceType: "PER_GB",
        quantity: sizeInGB,
        unit: "GB",
        ratePerUnit,
        totalAmount,
        currency: "BDT",
        usageDate,
        billingMonth,
        billingYear,
        referenceId: fileId || null,
        referenceType: fileId ? "FILE" : null,
        metadata: {
          fileName: fileName || null,
          fileType: fileType || null,
          originalSize: Number(quantity),
          originalUnit: unit,
        },
        status: "ACTIVE",
        isBillable: true,
      },
    });

    await this.updateCourseSummary(
      courseId,
      adminId,
      serviceId,
      null,
      billingYear,
      billingMonth,
    );
    return usage;
  }

  //PER_STUDENT
  async trackStudentUsage(data) {
    const {
      courseId,
      adminId,
      serviceId,
      offeringPriceId,
      defaultServicePriceId,
      studentCount,
      ratePerStudent,
      month,
      year,
      isDefault,
    } = data;

    if (!studentCount || studentCount <= 0)
      throw new AppErrors(400, "Student count must be > 0");

    const totalAmount = parseFloat(
      (studentCount * Number(ratePerStudent)).toFixed(10),
    );
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const usage = await prisma.serviceUsageLog.create({
      data: {
        courseId,
        adminId,
        serviceId,
        offeringPriceId: isDefault ? null : offeringPriceId,
        defaultServicePriceId: isDefault ? defaultServicePriceId : null,
        priceType: "PER_STUDENT",
        quantity: studentCount,
        unit: "STUDENT",
        ratePerUnit: ratePerStudent,
        totalAmount,
        currency: "BDT",
        usageDate: startDate,
        billingMonth: month,
        billingYear: year,
        startTime: startDate,
        endTime: endDate,
        referenceType: "BATCH",
        metadata: { studentCount, month, year },
        status: "ACTIVE",
        isBillable: true,
      },
    });

    await this.updateCourseSummary(
      courseId,
      adminId,
      serviceId,
      null,
      year,
      month,
    );
    return usage;
  }

  //FIXED / ONE_TIME
  async trackFixedUsage(data) {
    const {
      courseId,
      adminId,
      serviceId,
      offeringPriceId,
      defaultServicePriceId,
      quantity,
      ratePerUnit,
      priceType,
      billingMonth,
      billingYear,
      isDefault,
    } = data;

    //never charge ONE_TIME / FIXED more than once
    const existing = await this._checkDuplicate({
      adminId,
      courseId,
      serviceId,
      priceType,
    });
    if (existing) return existing;

    const qty = Math.max(Number(quantity) || 1, 1);
    const rate = Number(ratePerUnit) || 0;
    const totalAmount = parseFloat((qty * rate).toFixed(10));

    const usage = await prisma.serviceUsageLog.create({
      data: {
        courseId,
        adminId,
        serviceId,
        offeringPriceId: isDefault ? null : offeringPriceId,
        defaultServicePriceId: isDefault ? defaultServicePriceId : null,
        priceType,
        quantity: qty,
        unit: "UNIT",
        ratePerUnit: rate,
        totalAmount,
        currency: "BDT",
        usageDate: new Date(billingYear, billingMonth - 1, 1),
        billingMonth,
        billingYear,
        status: "ACTIVE",
        isBillable: true,
        metadata: { note: "one-time charge" },
      },
    });

    await this.updateCourseSummary(
      courseId,
      adminId,
      serviceId,
      null,
      billingYear,
      billingMonth,
    );
    return usage;
  }

  //MONTHLY
  async trackMonthlyUsage(data) {
    const {
      courseId,
      adminId,
      serviceId,
      offeringPriceId,
      defaultServicePriceId,
      quantity,
      ratePerUnit,
      billingMonth,
      billingYear,
      isDefault,
    } = data;

    //once per billing month
    const existing = await this._checkDuplicate({
      adminId,
      courseId,
      serviceId,
      priceType: "MONTHLY",
      billingYear,
      billingMonth,
    });
    if (existing) return existing;

    const qty = Math.max(Number(quantity) || 1, 1);
    const rate = Number(ratePerUnit) || 0;
    const totalAmount = parseFloat((qty * rate).toFixed(10));
    const startDate = new Date(billingYear, billingMonth - 1, 1);
    const endDate = new Date(billingYear, billingMonth, 0);

    const usage = await prisma.serviceUsageLog.create({
      data: {
        courseId,
        adminId,
        serviceId,
        offeringPriceId: isDefault ? null : offeringPriceId,
        defaultServicePriceId: isDefault ? defaultServicePriceId : null,
        priceType: "MONTHLY",
        quantity: qty,
        unit: "MONTH",
        ratePerUnit: rate,
        totalAmount,
        currency: "BDT",
        usageDate: startDate,
        billingMonth,
        billingYear,
        startTime: startDate,
        endTime: endDate,
        metadata: {
          recurrenceType: "MONTHLY",
          billingPeriod: `${billingMonth}/${billingYear}`,
        },
        status: "ACTIVE",
        isBillable: true,
      },
    });

    await this.updateCourseSummary(
      courseId,
      adminId,
      serviceId,
      null,
      billingYear,
      billingMonth,
    );
    return usage;
  }

  //YEARLY
  async trackYearlyUsage(data) {
    const {
      courseId,
      adminId,
      serviceId,
      offeringPriceId,
      defaultServicePriceId,
      quantity,
      ratePerUnit,
      billingMonth,
      billingYear,
      isDefault,
    } = data;

    //once per billing year
    const existing = await this._checkDuplicate({
      adminId,
      courseId,
      serviceId,
      priceType: "YEARLY",
      billingYear,
    });
    if (existing) return existing;

    const qty = Math.max(Number(quantity) || 1, 1);
    const rate = Number(ratePerUnit) || 0;
    const totalAmount = parseFloat((qty * rate).toFixed(10));
    const startDate = new Date(billingYear, 0, 1);
    const endDate = new Date(billingYear, 11, 31);

    const usage = await prisma.serviceUsageLog.create({
      data: {
        courseId,
        adminId,
        serviceId,
        offeringPriceId: isDefault ? null : offeringPriceId,
        defaultServicePriceId: isDefault ? defaultServicePriceId : null,
        priceType: "YEARLY",
        quantity: qty,
        unit: "YEAR",
        ratePerUnit: rate,
        totalAmount,
        currency: "BDT",
        usageDate: startDate,
        billingMonth,
        billingYear,
        startTime: startDate,
        endTime: endDate,
        metadata: { recurrenceType: "YEARLY", billingPeriod: `${billingYear}` },
        status: "ACTIVE",
        isBillable: true,
      },
    });

    await this.updateCourseSummary(
      courseId,
      adminId,
      serviceId,
      null,
      billingYear,
      billingMonth,
    );
    return usage;
  }

  //PER_CLASS / PER_COURSE / PER_USER / PER_API_CALL
  async trackCountUsage(data) {
    const {
      adminId,
      courseId,
      serviceId,
      offeringPriceId,
      defaultServicePriceId,
      quantity,
      ratePerUnit,
      billingMonth,
      billingYear,
      isDefault,
      countType,
      referenceId,
      referenceType,
      metadata,
    } = data;

    const qty = Math.max(Number(quantity) || 1, 1);
    const rate = Number(ratePerUnit) || 0;
    const totalAmount = parseFloat((qty * rate).toFixed(10));

    const unitMap = {
      PER_CLASS: "CLASS",
      PER_COURSE: "COURSE",
      PER_USER: "USER",
      PER_API_CALL: "API_CALL",
    };

    const usage = await prisma.serviceUsageLog.create({
      data: {
        adminId,
        courseId,
        serviceId,
        offeringPriceId: isDefault ? null : offeringPriceId,
        defaultServicePriceId: isDefault ? defaultServicePriceId : null,
        priceType: countType,
        quantity: qty,
        unit: unitMap[countType] || "COUNT",
        ratePerUnit: rate,
        totalAmount,
        currency: "BDT",
        usageDate: new Date(billingYear, billingMonth - 1, 1),
        billingMonth,
        billingYear,
        referenceId: referenceId || null,
        referenceType: referenceType || countType.replace("PER_", ""),
        metadata: { ...metadata, countType, quantity: qty },
        status: "ACTIVE",
        isBillable: true,
      },
    });

    await this.updateCourseSummary(
      courseId,
      adminId,
      serviceId,
      null,
      billingYear,
      billingMonth,
    );
    return usage;
  }

  //CUSTOM
  async trackCustomUsage(data) {
    const {
      adminId,
      courseId,
      serviceId,
      offeringPriceId,
      defaultServicePriceId,
      quantity,
      ratePerUnit,
      billingMonth,
      billingYear,
      isDefault,
      customUnit,
      description,
    } = data;

    const qty = Math.max(Number(quantity) || 1, 1);
    const rate = Number(ratePerUnit) || 0;
    const totalAmount = parseFloat((qty * rate).toFixed(10));

    const usage = await prisma.serviceUsageLog.create({
      data: {
        adminId,
        courseId,
        serviceId,
        offeringPriceId: isDefault ? null : offeringPriceId,
        defaultServicePriceId: isDefault ? defaultServicePriceId : null,
        priceType: "CUSTOM",
        quantity: qty,
        unit: customUnit || "UNIT",
        ratePerUnit: rate,
        totalAmount,
        currency: "BDT",
        usageDate: new Date(billingYear, billingMonth - 1, 1),
        billingMonth,
        billingYear,
        metadata: { description, customUnit },
        status: "ACTIVE",
        isBillable: true,
      },
    });

    await this.updateCourseSummary(
      courseId,
      adminId,
      serviceId,
      null,
      billingYear,
      billingMonth,
    );
    return usage;
  }

  // Summary Aggregation
  async updateCourseSummary(
    courseId,
    adminId,
    serviceId,
    offeringId,
    year,
    month,
  ) {
    const baseWhere = {
      courseId,
      adminId,
      serviceId,
      billingYear: year,
      billingMonth: month,
      isDeleted: false,
      isBillable: true,
    };

    const [agg, hourlyLogs, storageLogs] = await Promise.all([
      prisma.serviceUsageLog.aggregate({
        where: baseWhere,
        _sum: { quantity: true, totalAmount: true },
      }),
      prisma.serviceUsageLog.findMany({
        where: { ...baseWhere, priceType: "PER_HOUR" },
        select: { quantity: true },
      }),
      prisma.serviceUsageLog.findMany({
        where: { ...baseWhere, priceType: "PER_GB" },
        select: { quantity: true },
      }),
    ]);

    const summary = await prisma.courseServiceUsageSummary.upsert({
      where: {
        courseId_adminId_serviceId_billingYear_billingMonth: {
          courseId,
          adminId,
          serviceId,
          billingYear: year,
          billingMonth: month,
        },
      },
      update: {
        totalQuantity: agg._sum.quantity || 0,
        totalAmount: agg._sum.totalAmount || 0,
        hourlyUsage: hourlyLogs.reduce((s, l) => s + l.quantity, 0),
        storageUsage: storageLogs.reduce((s, l) => s + l.quantity, 0),
        updatedAt: new Date(),
      },
      create: {
        courseId,
        adminId,
        serviceId,
        billingYear: year,
        billingMonth: month,
        totalQuantity: agg._sum.quantity || 0,
        totalAmount: agg._sum.totalAmount || 0,
        hourlyUsage: hourlyLogs.reduce((s, l) => s + l.quantity, 0),
        storageUsage: storageLogs.reduce((s, l) => s + l.quantity, 0),
        status: "DRAFT",
      },
    });

    return summary;
  }

  //Monthly Bill Generation
  async generateMonthlyBill(adminId, year, month) {
    const existingBill = await prisma.adminMonthlyBill.findFirst({
      where: {
        adminId,
        billingYear: year,
        billingMonth: month,
        isDeleted: false,
      },
    });
    if (existingBill)
      throw new AppErrors(409, "Bill already exists for this period");

    const summaries = await prisma.courseServiceUsageSummary.findMany({
      where: {
        adminId,
        billingYear: year,
        billingMonth: month,
        status: "DRAFT",
      },
      include: { course: true, service: true },
    });

    if (!summaries.length)
      throw new AppErrors(404, "No usage found for this period");

    const courseBreakdown = {};
    let subtotal = 0;

    summaries.forEach((s) => {
      const courseName =
        s.course.productFullName ||
        s.course.productName ||
        s.course.title ||
        s.courseId;
      if (!courseBreakdown[courseName]) {
        courseBreakdown[courseName] = {
          courseId: s.courseId,
          services: [],
          total: 0,
        };
      }
      const amount = Number(s.totalAmount);
      courseBreakdown[courseName].services.push({
        serviceName: s.service.name,
        serviceCode: s.service.code,
        quantity: s.totalQuantity,
        amount,
      });
      courseBreakdown[courseName].total += amount;
      subtotal += amount;
    });

    const invoiceNumber = `INV-${year}${String(month).padStart(2, "0")}-${adminId.slice(0, 8).toUpperCase()}`;
    const dueDate = new Date(year, month, 10);

    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.adminMonthlyBill.create({
        data: {
          adminId,
          billingYear: year,
          billingMonth: month,
          subtotal,
          discount: 0,
          tax: 0,
          totalAmount: subtotal,
          paidAmount: 0,
          dueAmount: subtotal,
          currency: "BDT",
          courseBreakdown,
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate,
          status: "PENDING",
          summaries: { connect: summaries.map((s) => ({ id: s.id })) },
        },
      });

      await tx.courseServiceUsageSummary.updateMany({
        where: { id: { in: summaries.map((s) => s.id) } },
        data: { status: "INVOICED", invoiceNumber, invoiceDate: new Date() },
      });

      return created;
    });

    return bill;
  }

  //Admin Usage Overview
  async getAllAdminsUsage(filters = {}) {
    const { year, month, courseId, serviceId, page = 1, limit = 20 } = filters;

    const where = {
      ...(year && month && { billingYear: year, billingMonth: month }),
      ...(courseId && { courseId }),
      ...(serviceId && { serviceId }),
    };

    const [summaries, total] = await Promise.all([
      prisma.courseServiceUsageSummary.findMany({
        where,
        include: {
          admin: { select: { id: true, name: true, email: true, phone: true } },
          course: {
            select: {
              id: true,
              productFullName: true,
              productName: true,
              title: true,
            },
          },
          service: { select: { id: true, name: true, code: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { billingYear: "desc" },
          { billingMonth: "desc" },
          { totalAmount: "desc" },
        ],
      }),
      prisma.courseServiceUsageSummary.count({ where }),
    ]);

    const adminWise = {};
    summaries.forEach((s) => {
      const aid = s.admin.id;
      if (!adminWise[aid]) {
        adminWise[aid] = { admin: s.admin, courses: [], totalAmount: 0 };
      }
      adminWise[aid].courses.push({
        courseName:
          s.course?.productFullName || s.course?.productName || s.course?.title,
        serviceName: s.service?.name,
        quantity: s.totalQuantity,
        amount: Number(s.totalAmount),
        month: s.billingMonth,
        year: s.billingYear,
      });
      adminWise[aid].totalAmount += Number(s.totalAmount);
    });

    return {
      data: Object.values(adminWise),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  //Get All Bills
  async getAllBills(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      year,
      month,
      adminId,
      search,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where = { isDeleted: false };
    if (status && status !== "ALL") where.status = status;
    if (year) where.billingYear = parseInt(year);
    if (month) where.billingMonth = parseInt(month);
    if (adminId) where.adminId = adminId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { transactionId: { contains: search, mode: "insensitive" } },
        { admin: { name: { contains: search, mode: "insensitive" } } },
        { admin: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const allowedSort = [
      "createdAt",
      "totalAmount",
      "dueAmount",
      "dueDate",
      "invoiceNumber",
      "billingYear",
      "billingMonth",
    ];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const safeOrder = sortOrder === "asc" ? "asc" : "desc";

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [bills, total] = await Promise.all([
      prisma.adminMonthlyBill.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photo: true,
              status: true,
            },
          },
          summaries: {
            take: 5,
            include: {
              course: {
                select: { id: true, productFullName: true, productName: true },
              },
              service: { select: { id: true, name: true, code: true } },
            },
          },
        },
        skip,
        take,
        orderBy: { [safeSort]: safeOrder },
      }),
      prisma.adminMonthlyBill.count({ where }),
    ]);

    const now = new Date();
    const transformedBills = bills.map((bill) => ({
      id: bill.id,
      invoiceNumber: bill.invoiceNumber,
      invoiceDate: bill.invoiceDate,
      dueDate: bill.dueDate,
      billingYear: bill.billingYear,
      billingMonth: bill.billingMonth,
      subtotal: parseFloat(bill.subtotal || 0),
      tax: parseFloat(bill.tax || 0),
      discount: parseFloat(bill.discount || 0),
      totalAmount: parseFloat(bill.totalAmount || 0),
      paidAmount: parseFloat(bill.paidAmount || 0),
      dueAmount: parseFloat(bill.dueAmount || 0),
      currency: bill.currency,
      status: bill.status,
      paymentMethod: bill.paymentMethod,
      transactionId: bill.transactionId,
      paymentDate: bill.paymentDate,
      courseBreakdown: bill.courseBreakdown,
      teacher: bill.admin
        ? {
            id: bill.admin.id,
            name: bill.admin.name,
            email: bill.admin.email,
            phone: bill.admin.phone,
            photo: bill.admin.photo,
            status: bill.admin.status,
          }
        : null,
      summaries:
        bill.summaries?.map((s) => ({
          id: s.id,
          courseId: s.courseId,
          courseName: s.course?.productFullName || s.course?.productName,
          serviceId: s.serviceId,
          serviceName: s.service?.name,
          totalQuantity: s.totalQuantity,
          totalAmount: parseFloat(s.totalAmount || 0),
          hourlyUsage: s.hourlyUsage,
          storageUsage: s.storageUsage,
          billingMonth: s.billingMonth,
          billingYear: s.billingYear,
        })) || [],
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
    }));

    const summary = {
      totalBills: total || 0,
      totalAmount: transformedBills.reduce((s, b) => s + b.totalAmount, 0),
      totalPaid: transformedBills.reduce((s, b) => s + b.paidAmount, 0),
      totalDue: transformedBills.reduce((s, b) => s + b.dueAmount, 0),
      pendingCount: transformedBills.filter((b) => b.status === "PENDING")
        .length,
      paidCount: transformedBills.filter((b) => b.status === "PAID").length,
      overdueCount: transformedBills.filter(
        (b) => b.status !== "PAID" && b.dueDate && new Date(b.dueDate) < now,
      ).length,
    };

    return {
      data: transformedBills,
      meta: {
        total: total || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil((total || 0) / parseInt(limit)),
        hasNextPage: skip + take < (total || 0),
        hasPrevPage: parseInt(page) > 1,
        summary,
      },
    };
  }

  //Bill Details
  async getBillDetails(billId) {
    const bill = await prisma.adminMonthlyBill.findUnique({
      where: { id: billId, isDeleted: false },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true,
            status: true,
          },
        },
        summaries: {
          include: {
            course: {
              select: {
                id: true,
                productFullName: true,
                productName: true,
                title: true,
                courseId: true,
                Category: true,
              },
            },
            service: { select: { id: true, name: true, description: true } },
            usageLogs: {
              where: { isDeleted: false },
              take: 10,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                quantity: true,
                totalAmount: true,
                usageDate: true,
                priceType: true,
                status: true,
                unit: true,
                ratePerUnit: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!bill) throw new AppErrors(404, "Bill not found");

    return {
      id: bill.id,
      invoiceNumber: bill.invoiceNumber,
      invoiceDate: bill.invoiceDate,
      dueDate: bill.dueDate,
      billingYear: bill.billingYear,
      billingMonth: bill.billingMonth,
      subtotal: parseFloat(bill.subtotal),
      tax: parseFloat(bill.tax),
      discount: parseFloat(bill.discount),
      totalAmount: parseFloat(bill.totalAmount),
      paidAmount: parseFloat(bill.paidAmount),
      dueAmount: parseFloat(bill.dueAmount),
      currency: bill.currency,
      status: bill.status,
      paymentMethod: bill.paymentMethod,
      transactionId: bill.transactionId,
      paymentDate: bill.paymentDate,
      courseBreakdown: bill.courseBreakdown,
      teacher: {
        id: bill.admin.id,
        name: bill.admin.name,
        email: bill.admin.email,
        phone: bill.admin.phone,
        photo: bill.admin.photo,
        status: bill.admin.status,
      },
      summaries: bill.summaries.map((s) => ({
        id: s.id,
        courseId: s.courseId,
        courseName:
          s.course?.productFullName || s.course?.productName || s.course?.title,
        serviceId: s.serviceId,
        serviceName: s.service?.name,
        totalQuantity: s.totalQuantity,
        totalAmount: parseFloat(s.totalAmount),
        hourlyUsage: s.hourlyUsage,
        storageUsage: s.storageUsage,
        studentCount: s.studentCount,
        classCount: s.classCount,
        apiCalls: s.apiCalls,
        status: s.status,
        billingMonth: s.billingMonth,
        billingYear: s.billingYear,
        usageLogs:
          s.usageLogs?.map((l) => ({
            id: l.id,
            quantity: l.quantity,
            unit: l.unit,
            ratePerUnit: parseFloat(l.ratePerUnit),
            totalAmount: parseFloat(l.totalAmount),
            usageDate: l.usageDate,
            priceType: l.priceType,
            status: l.status,
            createdAt: l.createdAt,
          })) || [],
      })),
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
    };
  }

  //Update Bill Payment
  async updateBillPayment(billId, paymentData) {
    const { paidAmount, paymentMethod, transactionId, paymentDate } =
      paymentData;

    if (!paidAmount || Number(paidAmount) <= 0)
      throw new AppErrors(400, "Payment amount must be > 0");

    const bill = await prisma.adminMonthlyBill.findUnique({
      where: { id: billId, isDeleted: false },
    });
    if (!bill) throw new AppErrors(404, "Bill not found");
    if (bill.status === "PAID")
      throw new AppErrors(400, "Bill is already fully paid");

    const currentPaid = parseFloat(bill.paidAmount);
    const newPaid = parseFloat(
      (currentPaid + parseFloat(paidAmount)).toFixed(10),
    );
    const totalAmount = parseFloat(bill.totalAmount);
    const newDue = parseFloat((totalAmount - newPaid).toFixed(10));

    if (newPaid > totalAmount)
      throw new AppErrors(
        400,
        `Overpayment: max payable is ${totalAmount - currentPaid}`,
      );

    const newStatus =
      newDue <= 0 ? "PAID" : bill.status === "DRAFT" ? "PENDING" : bill.status;

    return prisma.adminMonthlyBill.update({
      where: { id: billId },
      data: {
        paidAmount: newPaid,
        dueAmount: newDue < 0 ? 0 : newDue,
        status: newStatus,
        paymentMethod: paymentMethod || bill.paymentMethod,
        transactionId: transactionId || bill.transactionId,
        paymentDate: paymentDate
          ? new Date(paymentDate)
          : newStatus === "PAID"
            ? new Date()
            : bill.paymentDate,
        updatedAt: new Date(),
      },
    });
  }

  //Teacher Courses
  async getTeacherCourses(adminId) {
    const offerings = await prisma.courseAdminServiceOffering.findMany({
      where: { adminId, status: "ACCEPTED", isDeleted: false },
      include: {
        courseAdmin: {
          include: {
            course: {
              select: {
                id: true,
                productFullName: true,
                productName: true,
                title: true,
                courseImage: true,
                Category: true,
                courseId: true,
              },
            },
          },
        },
        service: { select: { id: true, name: true } },
        prices: { where: { isDeleted: false } },
      },
      distinct: ["courseId"],
      orderBy: { createdAt: "desc" },
    });

    return offerings
      .sort((a, b) => {
        const nameA =
          a.courseAdmin?.course?.productFullName ||
          a.courseAdmin?.course?.productName ||
          "";
        const nameB =
          b.courseAdmin?.course?.productFullName ||
          b.courseAdmin?.course?.productName ||
          "";
        return nameA.localeCompare(nameB);
      })
      .map((o) => ({
        courseId: o.courseAdmin?.course?.id,
        productFullName: o.courseAdmin?.course?.productFullName,
        productName: o.courseAdmin?.course?.productName,
        title: o.courseAdmin?.course?.title,
        courseImage: o.courseAdmin?.course?.courseImage,
        category: o.courseAdmin?.course?.Category,
        courseCode: o.courseAdmin?.course?.courseId,
        offeringId: o.id,
        offeringStatus: o.status,
        assignedAt: o.createdAt,
      }));
  }

  //Teacher Services
  async getTeacherServices(adminId, courseId) {
    const offerings = await prisma.courseAdminServiceOffering.findMany({
      where: { adminId, courseId, status: "ACCEPTED", isDeleted: false },
      include: {
        service: {
          select: { id: true, name: true, description: true, isActive: true },
        },
        prices: { where: { isDeleted: false }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return offerings.map((o) => {
      const defaultPrice = o.prices.find((p) => p.isDefault) || o.prices[0];
      return {
        serviceId: o.service.id,
        serviceName: o.service.name,
        description: o.service.description,
        isActive: o.service.isActive,
        offeringId: o.id,
        offeringStatus: o.status,
        priceId: defaultPrice?.id || null,
        amount: defaultPrice ? parseFloat(defaultPrice.amount) : 0,
        priceType: defaultPrice?.type || "CUSTOM",
        isDefault: !!defaultPrice?.isDefault,
        currency: defaultPrice?.currency || "BDT",
        minQty: defaultPrice?.minQty,
        maxQty: defaultPrice?.maxQty,
        assignedAt: o.createdAt,
      };
    });
  }

  //Service With Price
  async getServiceWithPrice(serviceId, adminId, courseId) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!serviceId || !uuidRegex.test(serviceId))
      throw new AppErrors(400, `Invalid service ID: ${serviceId}`);
    if (!adminId || !uuidRegex.test(adminId))
      throw new AppErrors(400, `Invalid admin ID: ${adminId}`);
    if (!courseId || !uuidRegex.test(courseId))
      throw new AppErrors(400, `Invalid course ID: ${courseId}`);

    const [service, offering, defaultPrice] = await Promise.all([
      prisma.addOnService.findUnique({
        where: { id: serviceId, isDeleted: false },
        select: { id: true, name: true, description: true, isActive: true },
      }),
      prisma.courseAdminServiceOffering.findFirst({
        where: {
          adminId,
          courseId,
          serviceId,
          status: "ACCEPTED",
          isDeleted: false,
        },
        include: {
          prices: {
            where: { isDeleted: false },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          },
        },
      }),
      prisma.courseDefaultServicePrice.findFirst({
        where: {
          isDeleted: false,
          isActive: true,
          courseDefaultService: {
            courseId,
            serviceId,
            isDeleted: false,
            isActive: true,
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          courseDefaultService: {
            select: { id: true, courseId: true, serviceId: true },
          },
        },
      }),
    ]);

    if (!service) throw new AppErrors(404, "Service not found");

    let priceInfo = null;
    let isCustomPrice = false;

    if (offering?.prices?.length) {
      const cp = offering.prices[0];
      priceInfo = {
        id: cp.id,
        amount: parseFloat(cp.amount),
        type: cp.type,
        isDefault: cp.isDefault,
        currency: cp.currency,
        minQty: cp.minQty,
        maxQty: cp.maxQty,
        note: cp.note,
      };
      isCustomPrice = true;
    } else if (defaultPrice) {
      priceInfo = {
        id: defaultPrice.id,
        amount: parseFloat(defaultPrice.amount),
        type: defaultPrice.type,
        isDefault: true,
        currency: defaultPrice.currency,
        minQty: defaultPrice.minQty,
        maxQty: defaultPrice.maxQty,
        note: defaultPrice.note,
      };
    }

    return {
      serviceId: service.id,
      serviceName: service.name,
      description: service.description,
      isActive: service.isActive,
      price: priceInfo,
      hasCustomPrice: isCustomPrice,
      hasDefaultPrice: !!defaultPrice,
      offering: offering
        ? {
            id: offering.id,
            status: offering.status,
            assignedAt: offering.createdAt,
            prices: offering.prices.map((p) => ({
              id: p.id,
              amount: parseFloat(p.amount),
              type: p.type,
              isDefault: p.isDefault,
              currency: p.currency,
            })),
          }
        : null,
    };
  }
}

export const UsageTrackingClass = new UsageTrackingService();

// Price Resolution
export const resolvePriceId = async ({
  courseId,
  adminId,
  serviceId,
  priceId,
  unit,
}) => {
  // Direct offering price match by ID
  if (priceId) {
    const offeringPrice =
      await prisma.courseAdminServiceOfferingPrice.findFirst({
        where: {
          id: priceId,
          isDeleted: false,
          offering: { courseId, adminId, serviceId },
        },
      });
    if (offeringPrice)
      return {
        priceId: offeringPrice.id,
        isDefault: false,
        amount: parseFloat(offeringPrice.amount),
        priceType: offeringPrice.type,
      };
  }

  // Offering price by type match
  const offeringPrice = await prisma.courseAdminServiceOfferingPrice.findFirst({
    where: {
      isDeleted: false,
      type: unit,
      offering: {
        courseId,
        adminId,
        serviceId,
        status: "ACCEPTED",
        isDeleted: false,
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  if (offeringPrice)
    return {
      priceId: offeringPrice.id,
      isDefault: false,
      amount: parseFloat(offeringPrice.amount),
      priceType: offeringPrice.type,
    };

  // Course default price
  const defaultPrice = await prisma.courseDefaultServicePrice.findFirst({
    where: {
      isDeleted: false,
      type: unit,
      isActive: true,
      courseDefaultService: {
        courseId,
        serviceId,
        isDeleted: false,
        isActive: true,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (defaultPrice)
    return {
      priceId: defaultPrice.id,
      isDefault: true,
      amount: parseFloat(defaultPrice.amount),
      priceType: defaultPrice.type,
    };

  throw new AppErrors(404, `No price found for service unit type: ${unit}`);
};
