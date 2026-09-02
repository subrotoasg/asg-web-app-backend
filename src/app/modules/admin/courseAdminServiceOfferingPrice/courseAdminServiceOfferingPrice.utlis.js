export const normalizePriceFieldsByType = (existing, incoming) => {
  const finalType = incoming.type || existing.type;

  const quantityTypes = ["PER_STUDENT", "PER_CLASS"];

  const updated = {
    ...incoming,
  };

  if (!quantityTypes.includes(finalType)) {
    updated.minQty = null;
    updated.maxQty = null;
  }

  return updated;
};
