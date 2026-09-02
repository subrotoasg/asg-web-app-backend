import nodemailer from "nodemailer";
import config from "../config/index.js";
import qs from "qs";
import axios from "axios";

export const sendEmail = async (to, html) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: config.node_env === "production",
    auth: {
      user: config.smtp_email,
      pass: config.smtp_password,
    },
  });

  await transporter.sendMail({
    from: config.smtp_email, // sender address
    to, // list of receivers
    subject: "Please Reset Your Password", // Subject line
    text: "Reset Your Password within 10 min", // plain text body
    html, // html body
  });
};

export const sendEmailWithProbaho = async (
  toName,
  toEmail,
  subject,
  htmlBody
) => {
  const safeToName = toName || "Dear User";

  const data = qs.stringify({
    to_name: safeToName,
    to_email: toEmail,
    from_name: config.from_email_name,
    from_email: config.from_email,
    subject: subject,
    body: htmlBody,
    reply_to_email: config.replay_email,
    reply_to_name: config.replay_to_name,
  });
  const options = {
    method: "POST",
    maxBodyLength: Infinity,
    url: "https://api.probaho.com.bd/transact/create",
    headers: {
      "PUBLIC-KEY": config.email_key_access,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  try {
    const response = await axios.request(options);
    console.log(response?.data, "from probaho");
    return response;
  } catch (error) {
    console.error("❌ Email send failed:");
    return error;
  }
};
