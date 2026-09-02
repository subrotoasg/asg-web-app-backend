export const convertInToUTC = (localDateTime) => {
  const local = new Date(localDateTime);
  if (isNaN(local.getTime())) {
    return null;
  }
  return local.toISOString();
};

export const convertToUTC = (localDateTime) => {
  if (!localDateTime) {
    console.error("Invalid input: null or undefined");
    return null;
  }

  if (localDateTime instanceof Date) {
    if (isNaN(localDateTime.getTime())) {
      console.error("Invalid Date object");
      return null;
    }
    return localDateTime.toISOString();
  }

  if (typeof localDateTime === "number") {
    const date = new Date(localDateTime);
    if (isNaN(date.getTime())) {
      console.error("Invalid timestamp");
      return null;
    }
    return date.toISOString();
  }

  if (typeof localDateTime !== "string") {
    console.error("Invalid input type:", typeof localDateTime, localDateTime);
    return null;
  }

  try {
    const [datePart, timePart] = localDateTime.split("T");

    if (!datePart || !timePart) {
      console.error("Invalid datetime format:", localDateTime);
      return null;
    }

    const [year, month, day] = datePart.split("-");
    const [hour, minute] = timePart.split(":");

    const bangladeshTime = new Date(`${datePart}T${hour}:${minute}:00+06:00`);

    if (isNaN(bangladeshTime.getTime())) {
      console.error("Invalid date created from:", localDateTime);
      return null;
    }

    return bangladeshTime.toISOString();
  } catch (error) {
    console.error(
      "Error processing datetime:",
      error.message,
      "Input:",
      localDateTime
    );
    return null;
  }
};

export const fromUTCToLocal = (utcInput) => {
  if (!utcInput) return null;

  const date = utcInput instanceof Date ? utcInput : new Date(utcInput);

  if (isNaN(date.getTime())) {
    return null;
  }

  const pad = (n) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};
