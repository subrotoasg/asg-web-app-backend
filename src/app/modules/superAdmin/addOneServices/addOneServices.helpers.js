export function formatTeacherServices(teachers) {
  return teachers.map((teacher) => {
    let totalMonthlyCost = 0;
    let totalOneTimeCost = 0;
    let totalYearlyCost = 0;

    const courses = teacher?.courseAdmin?.map((ca) => {
      const courseServices = [];

      ca?.course?.courseDefaultServices?.forEach((ds) => {
        ds?.prices?.forEach((price) => {
          courseServices.push({
            serviceId: ds.service.id,
            serviceName: ds.service.name,
            serviceCode: ds.service.code,
            serviceDescription: ds.service.description,
            type: "DEFAULT",
            priceId: price.id,
            priceType: price.type,
            amount: Number(price.amount),
            currency: price.currency,
            minQty: price.minQty,
            maxQty: price.maxQty,
            isDefault: price.isDefault,
            note: price.note,
            isSelected: false,
          });
        });
      });

      ca?.course?.adminServiceOfferings?.forEach((offering) => {
        offering?.prices?.forEach((price) => {
          const isSelected = offering.selection?.selectedPriceId === price.id;

          if (isSelected) {
            switch (price.type) {
              case "MONTHLY":
              case "PER_MONTH":
                totalMonthlyCost += Number(price.amount);
                break;
              case "YEARLY":
              case "PER_YEAR":
                totalYearlyCost += Number(price.amount);
                break;
              case "ONE_TIME":
              case "FIXED":
              case "PER_COURSE":
                totalOneTimeCost += Number(price.amount);
                break;
              case "PER_CLASS":
              case "PER_STUDENT":
              case "PER_MB":
              case "PER_GB":
              case "PER_TB":
              case "BANDWIDTH":
              case "PER_HOUR":
              case "PER_MINUTE":
              case "PER_API_CALL":
              case "PER_USER":
              case "CUSTOM":
                courseServices.push({
                  serviceId: offering.service.id,
                  serviceName: offering.service.name,
                  serviceCode: offering.service.code,
                  serviceDescription: offering.service.description,
                  type: "OFFERING",
                  status: offering.status,
                  offeredAt: offering.offeredAt,
                  expiresAt: offering.expiresAt,
                  note: offering.note,
                  priceId: price.id,
                  priceType: price.type,
                  amount: Number(price.amount),
                  currency: price.currency,
                  minQty: price.minQty,
                  maxQty: price.maxQty,
                  isDefault: price.isDefault,
                  priceNote: price.note,
                  selectedAt: offering.selection?.selectedAt,
                  isSelected: isSelected,
                  requiresCalculation: true,
                  calculationNote: `${price.type} - Quantity based pricing`,
                });
                break;
              default:
                totalMonthlyCost += Number(price.amount);
            }
          }

          courseServices.push({
            serviceId: offering.service.id,
            serviceName: offering.service.name,
            serviceCode: offering.service.code,
            serviceDescription: offering.service.description,
            type: "OFFERING",
            status: offering.status,
            offeredAt: offering.offeredAt,
            expiresAt: offering.expiresAt,
            note: offering.note,
            priceId: price.id,
            priceType: price.type,
            amount: Number(price.amount),
            currency: price.currency,
            minQty: price.minQty,
            maxQty: price.maxQty,
            isDefault: price.isDefault,
            priceNote: price.note,
            selectedAt: offering.selection?.selectedAt,
            isSelected: isSelected,
          });
        });
      });

      const totalDefaultPrice = courseServices
        ?.filter((s) => s.type === "DEFAULT" && s.isDefault)
        ?.reduce((sum, s) => sum + s.amount, 0);

      return {
        courseId: ca.course.id,
        productFullName: ca.course.productFullName,
        productName: ca.course.productName,
        category: ca.course.category,
        courseCode: ca.course.code,
        subCategory: ca.course.SubCategory,
        services: courseServices,
        serviceCount: courseServices.length,
        defaultServiceCount: courseServices?.filter((s) => s.type === "DEFAULT")
          .length,
        offeringServiceCount: courseServices?.filter(
          (s) => s.type === "OFFERING",
        ).length,
        selectedServiceCount: courseServices?.filter((s) => s.isSelected)
          .length,
        totalDefaultPrice: totalDefaultPrice,
      };
    });

    const totalMonthly =
      totalMonthlyCost + totalYearlyCost / 12 + totalOneTimeCost / 12;

    const allServices = courses?.flatMap((c) => c.services) || [];
    const selectedServices = allServices.filter((s) => s.isSelected);

    return {
      teacher: {
        id: teacher?.id,
        name: teacher?.name,
        email: teacher?.email,
        phone: teacher?.phone,
        status: teacher.status,
      },
      summary: {
        totalCourses: teacher?.courseAdmin?.length || 0,
        totalServices: allServices.length,
        totalDefaultServices: allServices.filter((s) => s.type === "DEFAULT")
          .length,
        totalOfferingServices: allServices.filter((s) => s.type === "OFFERING")
          .length,
        selectedServices: selectedServices.length,
        totalMonthlyCost: totalMonthly,
        totalYearlyCost: totalYearlyCost,
        totalOneTimeCost: totalOneTimeCost,
        currency: "BDT",
      },
      courses: courses,
    };
  });
}
