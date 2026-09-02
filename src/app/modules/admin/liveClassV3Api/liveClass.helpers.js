import axios from "axios";

export const sendLiveClassNotification = async ({
  subject,
  videoDescription,
  instructor,
  streamTime,
}) => {
  let now = new Date(streamTime);
  now.setMinutes(now.getMinutes());

  const datas = JSON.stringify({
    app_id: process.env.ONE_SIGNAL_APP,
    included_segments: ["Subscribed Users"],
    headings: {
      en: `New ${subject} Class starting ${now.toLocaleString("en-IN")} !`,
    },
    contents: {
      en: `Class : ${videoDescription}\nTime : ${now.toLocaleString("en-IN")}\nInstructor : ${instructor}`,
    },
    web_url: process.env.HOST,
    app_url: process.env.HOST,
    chrome_web_image: `${process.env.HOST}/assets/img/live-now.png`,
    big_picture: `${process.env.HOST}/assets/img/live-now.png`,
    web_buttons: [
      {
        id: "Join-button",
        text: "Join Class",
        icon: "https://cdn-icons-png.flaticon.com/512/3554/3554469.png",
        url: process.env.HOST,
      },
    ],
  });

  const config = {
    method: "post",
    url: "https://onesignal.com/api/v1/notifications",
    headers: {
      Authorization: `Basic ${process.env.ONE_SIGNAL_AUTH}`,
      "Content-Type": "application/json",
    },
    data: datas,
  };

  try {
    await axios(config);
    console.log(" Notification sent successfully");
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
};
