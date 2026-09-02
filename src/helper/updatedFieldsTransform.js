export const transformUpdatedFields = (fieldsToUpdate, arrayFields = []) => {
  let updatedFields = {};

  Object.keys(fieldsToUpdate).forEach((field) => {
    if (
      fieldsToUpdate[field] !== undefined &&
      fieldsToUpdate[field] !== null &&
      fieldsToUpdate[field] !== ""
    ) {
      if (arrayFields.includes(field) && Array.isArray(fieldsToUpdate[field])) {
        const filteredValues = fieldsToUpdate[field].filter(
          (value) => value !== undefined && value !== null && value !== ""
        );

        if (filteredValues.length > 0) {
          updatedFields[field] = {};
          filteredValues.forEach((value, index) => {
            updatedFields[field][`field_${index + 1}`] = value;
          });
        }
      } else {
        updatedFields[field] = fieldsToUpdate[field];
      }
    }
  });

  return updatedFields;
};
