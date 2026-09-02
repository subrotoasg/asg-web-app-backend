export const nestedSelectFields = (fields = []) => {
  const select = {};

  fields.forEach((fieldPath) => {
    const keys = fieldPath.split(".");
    let current = select;

    while (keys.length > 0) {
      const key = keys.shift();

      if (!current[key]) {
        current[key] = keys.length > 0 ? { select: {} } : true;
      }

      if (keys.length > 0) {
        current = current[key].select;
      }
    }
  });

  return select;
};
