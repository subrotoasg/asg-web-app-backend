import nodemailer from "nodemailer";
import config from "../config/index.js";

const smsTransport = (phone, message) => {
  let smsConfig = {
    method: "get",
    maxBodyLength: Infinity,
    timeout: 60000,
    url: `http://bulksmsbd.net/api/smsapi?api_key=${
      config.sms_api_key
    }&type=text&number=${phone}&senderid=${config.sms_sender_id}&message=${
      message
    }`,
    headers: {},
  };
  return smsConfig;
};

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.smtp_email,
    pass: config.smtp_password,
  },
});

const mailBuilder = (from, to, subject, text) => {
  return {
    from,
    to,
    subject,
    text,
  };
};

const newLoginInfoText = (email, phone, pass) => {
  return `Your admin account has been created successfully. Here is your credentials,
    email: ${email}
    phone: ${phone}
    one time password: ${pass}
    Please change this temporary password afterwards.`;
};

const newMigrateInfoText = (email, phone, pass) => {
  return `Your student account has been migrated successfully. Here is your credentials,
    email: ${email}
    phone: ${phone}
    password: ${pass}`;
};

const newSolverAccountInfoText = (email, phone, pass) => {
  return `Your doubt solver account has been created successfully. Here is your credentials,
    email: ${email}
    phone: ${phone}
    one time password: ${pass}
    Please change this temporary password afterwards.`;
};

// const qnaPrompt =
//   "You are an HSC (Bangladesh curriculum) problem solver. " +
//   "Your ONLY task is to generate the **complete, detailed solution in Bangla Markdown format** for the following problem. " +
//   "Use **LaTeX** for all math expressions and equations. " +
//   "DO NOT include any text before or after the solution. **Start directly with the solution in Markdown.**";

const qnaPrompt =
  "You are an HSC (Bangladesh curriculum) problem solver. " +
  "Your ONLY task is to generate the **complete, detailed solution in Bangla Markdown format** for the following problem. " +
  "Use **LaTeX** for all math expressions and equations. " +
  "DO NOT include any text before or after the solution. **Start directly with the solution in Markdown.** " +
  "If any future question or message seems unrelated to the original problem or its solution, " +
  "politely respond in Bangla that it is out of context, for example: " +
  '"এই প্রশ্নটি মূল সমস্যার বাইরে বলে মনে হচ্ছে। অনুগ্রহ করে বর্তমান সমস্যাতেই মনোযোগ দিন।"';

const duplicateBuyHtml = `<!DOCTYPE html>
<html lang="bn">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <link
      rel="shortcut icon"
      href="https://aparsclassroom.com/favicon.ico"
      type="image/x-icon"
    />
    <link
      rel="icon"
      href="https://aparsclassroom.com/HSC-Full-Course/assets/images/1.png"
    />
    <link
      rel="apple-touch-icon"
      href="https://aparsclassroom.com/HSC-Full-Course/assets/images/1.png"
    />

    <title>চেকআউট - ASG Shop</title>
    <meta name="author" content="aparsclassroom.com" />

    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css?family=Poppins:100,200,300,400,500,600,700,800,900"
      type="text/css"
    />
    <link
      rel="stylesheet"
      href="https://use.fontawesome.com/releases/v5.15.3/css/all.css"
      integrity="sha384-SZXxX4whJ79/gErwcOYf+zWLeJdY/qpuqC4cAa9rOGUstPomtqpuNWT9wdPEn2fk"
      crossorigin="anonymous"
    />
    <link
      rel="stylesheet"
      type="text/css"
      href="https://aparsclassroom.com/shop/success.css"
    />

    <style>
      a:hover {
        text-decoration: none;
      }

      @font-face {
        font-family: Kalpurush;
        src: url("https://aparsclassroom.com/Ambassador/assets/fonts/ASG_TARIQ.TTF");
      }

      .bangla {
        font-family: Kalpurush;
      }

      /* Wrapper to keep center alignment consistent */
      .main-wrap {
        padding: 30px 0 10px;
      }

      /* Right column content */
      .notice-wrap {
        border-radius: 16px;
        padding: 22px 20px;
        background: rgba(83, 117, 226, 0.08);
        border: 1px solid rgba(83, 117, 226, 0.25);
        text-align: left;
      }

      .notice-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 20px;
        margin: 0 0 10px 0;
      }

      .notice-title .icon {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #5375e2;
        color: #fff;
        flex: 0 0 42px;
      }

      .notice-actions a {
        display: inline-block;
        margin-right: 10px;
        margin-top: 12px;
      }

      .btn-soft {
        border-radius: 999px;
        padding: 10px 16px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: #fff;
        color: #5375e2;
        font-weight: 600;
      }

      .btn-primary-pill {
        border-radius: 999px;
        padding: 10px 16px;
        background: #5375e2;
        color: #fff;
        font-weight: 700;
        border: none;
      }

      /* Make illustration fit nicely */
      .illus img {
        width: 100%;
        max-width: 460px;
        height: auto;
        display: block;
        margin: 0 auto;
      }

      /* Align top area better */
      .brand-area img {
        width: 100%;
        max-width: 300px;
        height: auto;
      }

      /* Mobile behavior - same as your checkout */
      @media only screen and (max-width: 768px) {
        #gw {
          order: 2;
          margin-top: 16px;
        }

        #tuto {
          display: none;
        }

        #info {
          order: 1;
        }

        .notice-wrap {
          text-align: center;
        }

        .notice-title {
          justify-content: center;
          text-align: left;
        }

        .notice-actions a {
          width: 100%;
          max-width: 320px;
          margin-right: 0;
        }
      }
    </style>
  </head>

  <body>
    <nav class="navbar sticky-top navbar-light bg-transparent">
      <a
        href="https://aparsclassroom.com/shop"
        style="
          text-decoration: none;
          color: #5375e2;
          font-size: large;
          font-weight: bold;
        "
      >
        <i class="fas fa-store-alt"></i> শপে ফিরে যান
      </a>
    </nav>

    <div class="container main-wrap">
      <div class="text-center brand-area">
        <img
          src="https://aparsclassroom.com/HSC-Full-Course/assets/images/1.png"
          alt="ASG Shop"
        />
        <h3 class="bangla mt-2">চেকআউট - ASG Shop</h3>
      </div>

      <div class="container mt-3">
        <div class="row align-items-center">
          <!-- Left: Illustration (same positioning as checkout template) -->
          <div class="col-sm text-center" id="info">
            <div class="illus" id="tuto">
              <img
                src="https://aparsclassroom.com/img/undraw_add_to_cart_re_wrdo.svg"
                alt="Add to Cart"
              />
            </div>
          </div>

          <!-- Right: Message -->
          <div class="col-sm" id="gw">
            <div class="notice-wrap">
              <div class="notice-title bangla">
                <span class="icon"><i class="fas fa-check"></i></span>
                <span>আপনি ইতোমধ্যে এই কোর্সটি কিনে ফেলেছেন</span>
              </div>

              <p class="bangla" style="margin: 0; font-size: 16px">
                আপনার অ্যাকাউন্টে কোর্সটি অ্যাক্টিভ আছে। আবার পেমেন্ট করার প্রয়োজন নেই।
              </p>

              <div class="notice-actions">
                <a class="btn-primary-pill bangla" href="https://aparsclassroom.com/shop">
                  <i class="fas fa-store-alt"></i> শপে যেতে ট্যাপ করুন
                </a>
                <a class="btn-soft bangla" href="mailto:support@aparsclassroom.com">
                  <i class="fas fa-envelope"></i> সাপোর্টে যোগাযোগ
                </a>
              </div>
            </div>
          </div>
          <!-- end right -->
        </div>
      </div>
    </div>

    <!-- Footer kept as-is -->
    <footer class="d-flex pb-5 pt-6 pt-md-7">
      <div class="container">
        <div class="row">
          <div class="col-lg-4">
            <p>
              Apars Classroom <strong>(ASG Shop)</strong> is an online education
              center based in Dhaka, Bangladesh, specializing in providing
              high-quality educational resources to students across the country.
              Established in 2018, the platform has quickly gained popularity
              among Bangladeshi students, with over 700,000 students actively
              learning and developing their skills through its diverse range of
              courses.
            </p>
            <ul class="d-flex list-unstyled mb-5 mb-lg-0">
              <li class="mr-2">
                <a
                  href="https://www.facebook.com/aparsclassroom/"
                  target="_blank"
                  class="btn btn-icon-only btn-pill btn-primary"
                  aria-label="facebook social link"
                  data-toggle="tooltip"
                  data-placement="top"
                  title="Like @aparsclassroom on Facebook"
                  ><span aria-hidden="true" class="fab fa-facebook"></span
                ></a>
              </li>
              <li class="mr-2">
                <a
                  href="https://instagram.com/aparsclassroom"
                  target="_blank"
                  class="btn btn-icon-only btn-pill btn-outline-danger"
                  aria-label="instagram social link"
                  data-toggle="tooltip"
                  data-placement="top"
                  title="Follow @aparsclassroom on insta"
                  ><span aria-hidden="true" class="fab fa-instagram"></span
                ></a>
              </li>
              <li class="mr-2">
                <a
                  href="https://youtube.com/aparsclassroom"
                  target="_blank"
                  class="btn btn-icon-only btn-pill btn-danger"
                  aria-label="youtube social link"
                  data-toggle="tooltip"
                  data-placement="top"
                  title="Subscribe our Channel"
                  ><span aria-hidden="true" class="fab fa-youtube"></span
                ></a>
              </li>
              <li class="mr-2">
                <a
                  href="mailto:support@aparsclassroom.com"
                  class="btn btn-icon-only btn-pill btn-dark"
                  aria-label="email link"
                  data-toggle="tooltip"
                  data-placement="top"
                  title="Email Us"
                  ><span aria-hidden="true" class="fas fa-envelope"></span
                ></a>
              </li>
            </ul>
          </div>

          <div class="col-lg-4 mb-5 mb-lg-0">
            <h5>Important Links</h5>
            <ul class="footer-links list-unstyled mt-2">
              <li class="mb-1">
                <a class="p-2" target="_blank" href="https://aparsclassroom.com/terms"
                  >Terms and Conditions</a
                >
              </li>
              <li class="mb-1">
                <a class="p-2" target="_blank" href="https://aparsclassroom.com/privacy"
                  >Privacy Policy</a
                >
              </li>
              <li class="mb-1">
                <a
                  class="p-2"
                  target="_blank"
                  href="https://aparsclassroom.com/return-and-refund-policy"
                  >Return and Refund Policy</a
                >
              </li>
              <li>
                <a class="p-2" target="_blank" href="https://aparsclassroom.com/contact"
                  >Contact Us</a
                >
              </li>
            </ul>
          </div>

          <div class="col-12 col-lg-4 mb-5 mb-lg-0">
            <h5>Disclaimer</h5>
            <p class="text-gray font-small m-0">
              All the products are listed for sale in the shop, are owned by the
              Company. Anyone can buy personal license for the products. But
              Reselling are Strictly prohibited. Learn more about
              <a class="text-danger" href="https://aparsclassroom.com/piracy"
                >Anti-Piracy Laws</a
              >
              &amp;
              <a class="text-danger" href="https://aparsclassroom.com/terms"
                >Terms and Conditions</a
              >.
            </p>
          </div>
        </div>

        <hr class="my-5" />

        <div class="row">
          <div class="col">
            <a href="/" target="_blank" class="d-flex justify-content-center"
              ><img
                src="https://aparsclassroom.com/HSC-Full-Course/assets/images/Logo-with-Name.png"
                height="50"
                class="mb-3"
                alt="Apar's Classroom Logo"
            /></a>
            <div class="d-flex text-center justify-content-center align-items-center" role="contentinfo">
              <p class="font-weight-normal font-small mb-0">
                &copy; <span class="current-year">2018-2024</span> Apar's Classroom<br />
                All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </body>
</html>

`;

export const constants = {
  transport,
  qnaPrompt,
  newMigrateInfoText,
  mailBuilder,
  newLoginInfoText,
  newSolverAccountInfoText,
  smsTransport,
  duplicateBuyHtml,
};
