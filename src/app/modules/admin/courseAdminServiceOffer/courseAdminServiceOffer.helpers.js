import config from "../../../config/index.js";
export function buildHostNameCondition(hostName) {
  if (!hostName) return {};
  if (
    hostName === config.frb_host_name ||
    hostName === config.frb_local_host_name
  ) {
    return {
      courseAdmin: {
        course: {
          AND: [
            {
              Category: {
                contains: "Academic",
              },
            },
            {
              productName: {
                contains: "FRB",
              },
            },
            {
              cycleAvailable: false,
            },
          ],
        },
      },
    };
  }

  if (
    hostName === config.academic_host_name ||
    hostName === config.academic_local_host_name
  ) {
    return {
      courseAdmin: {
        course: {
          cycleAvailable: true,
        },
      },
    };
  }

  if (
    hostName === config.varsity_host_name ||
    hostName === config.medical_host_name ||
    hostName === config.engineering_host_name ||
    hostName === config.admission_host_name
  ) {
    return {
      courseAdmin: {
        course: {
          AND: [
            {
              Category: {
                contains: "Admission",
              },
            },
            {
              NOT: {
                Category: {
                  contains: "Academic",
                },
              },
            },
            {
              cycleAvailable: false,
            },
          ],
        },
      },
    };
  }

  return {};
}
export function buildHostNameConditionForDefaultServices(hostName) {
  if (!hostName) return {};
  if (
    hostName === config.frb_host_name ||
    hostName === config.frb_local_host_name
  ) {
    return {
      course: {
        AND: [
          {
            Category: {
              contains: "Academic",
            },
          },
          {
            productName: {
              contains: "FRB",
            },
          },
          {
            cycleAvailable: false,
          },
        ],
      },
    };
  }

  if (
    hostName === config.academic_host_name ||
    hostName === config.academic_local_host_name
  ) {
    return {
      course: {
        cycleAvailable: true,
      },
    };
  }

  if (
    hostName === config.varsity_host_name ||
    hostName === config.medical_host_name ||
    hostName === config.engineering_host_name ||
    hostName === config.admission_host_name
  ) {
    return {
      course: {
        AND: [
          {
            Category: {
              contains: "Admission",
            },
          },
          {
            NOT: {
              Category: {
                contains: "Academic",
              },
            },
          },
          {
            cycleAvailable: false,
          },
        ],
      },
    };
  }

  return {};
}

export function calculateMonthlyBill(selectedPrice) {
  if (!selectedPrice) return 0;

  switch (selectedPrice.type) {
    case "MONTHLY":
      return selectedPrice.amount;
    case "YEARLY":
      return Math.round(selectedPrice.amount / 12);
    case "PER_STUDENT":
      return selectedPrice.amount * 30;
    default:
      return selectedPrice.amount;
  }
}

export function calculateYearlyBill(selectedPrice) {
  if (!selectedPrice) return 0;

  switch (selectedPrice.type) {
    case "MONTHLY":
      return selectedPrice.amount * 12;
    case "YEARLY":
      return selectedPrice.amount;
    case "PER_STUDENT":
      return selectedPrice.amount * 30 * 12;
    default:
      return selectedPrice.amount;
  }
}

export function getTimeRemaining(expiresAt) {
  if (!expiresAt) return null;

  const now = new Date();
  const diffTime = expiresAt - now;

  if (diffTime <= 0) return "Expired";

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} remaining`;
  }
  return `${diffDays} day${diffDays > 1 ? "s" : ""} remaining`;
}

export function getStatusBadge(serviceType, isRunning) {
  if (!isRunning) return { color: "red", text: "Expired" };
  return serviceType === "SELECTED"
    ? { color: "green", text: "Active" }
    : { color: "blue", text: "Available" };
}

export function groupPricesByType(prices) {
  return prices.reduce((acc, price) => {
    if (!acc[price.type]) {
      acc[price.type] = [];
    }
    acc[price.type].push(price);
    return acc;
  }, {});
}

export function getPriceRange(prices) {
  if (!prices.length) return { min: 0, max: 0, avg: 0 };

  const amounts = prices.map((p) => p.amount);
  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    avg: Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length),
  };
}

export function calculateMonthlyBillSummary(services) {
  const selectedServices = services.filter((s) => s.serviceType === "SELECTED");

  return {
    total: selectedServices.reduce(
      (sum, s) => sum + (s.billInfo?.estimatedMonthlyBill || 0),
      0,
    ),
    byService: selectedServices.map((s) => ({
      serviceName: s.service.name,
      amount: s.billInfo?.estimatedMonthlyBill || 0,
      type: s.billInfo?.selectedPrice?.type,
    })),
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10),
  };
}
