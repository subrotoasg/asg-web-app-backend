const escapeJsonForHtml = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

export const renderDesktopAuthPage = ({
  firebaseConfig,
  apiBaseUrl,
  nonce,
}) => {
  const pageConfig = escapeJsonForHtml({ firebaseConfig, apiBaseUrl });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <title>Sign in to ACS</title>
    <link rel="icon" type="image/png" href="https://cdn.apars.shop/green-alpha.png" />
    <style nonce="${nonce}">
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f4f6f3;
        color: #171b19;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f4f6f3;
      }
      main {
        width: min(100%, 420px);
        padding: 32px;
        background: #ffffff;
        border: 1px solid #dce3de;
        border-radius: 8px;
        box-shadow: 0 16px 44px rgba(20, 35, 27, .09);
        text-align: center;
      }
      .brand-logo {
        display: block;
        width: 96px;
        height: 96px;
        margin: -8px auto 12px;
        object-fit: contain;
      }
      h1 {
        margin: 0 0 9px;
        font-size: 24px;
        line-height: 1.25;
        letter-spacing: 0;
      }
      p {
        margin: 0 auto 24px;
        max-width: 34ch;
        color: #5d6862;
        font-size: 15px;
        line-height: 1.55;
      }
      button, a.button {
        width: 100%;
        min-height: 48px;
        display: inline-grid;
        grid-auto-flow: column;
        gap: 9px;
        place-content: center;
        place-items: center;
        border: 1px solid #00934f;
        border-radius: 6px;
        background: #00934f;
        color: #ffffff;
        font: inherit;
        font-weight: 700;
        letter-spacing: 0;
        text-decoration: none;
        cursor: pointer;
        transition: background-color .15s ease, border-color .15s ease, transform .15s ease;
      }
      button:hover:not(:disabled), a.button:hover {
        background: #007e44;
        border-color: #007e44;
      }
      button:active:not(:disabled), a.button:active { transform: translateY(1px); }
      button:focus-visible, a.button:focus-visible {
        outline: 3px solid rgba(0, 147, 79, .22);
        outline-offset: 3px;
      }
      button:disabled { opacity: .62; cursor: wait; }
      .secondary {
        margin-top: 10px;
        border-color: #cbd8d0 !important;
        background: #f1f6f3 !important;
        color: #11643e !important;
      }
      .secondary:hover { background: #e7f0ea !important; }
      #details {
        min-height: 21px;
        margin-top: 16px;
        color: #6d7771;
        font-size: 13px;
        line-height: 1.45;
      }
      .error { color: #b42318 !important; }
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, .42);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin .75s linear infinite;
      }
      .is-loading .button-label { opacity: .92; }
      [hidden] { display: none !important; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (max-width: 480px) {
        body { padding: 16px; }
        main { padding: 27px 22px; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          scroll-behavior: auto !important;
          transition-duration: .01ms !important;
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <img class="brand-logo" src="https://cdn.apars.shop/icon%2096x96.png" alt="ACS" width="96" height="96" />
      <h1 id="title">Sign in to ACS</h1>
      <p id="message">Choose your account to continue to the ACS desktop app.</p>
      <button id="continueButton" type="button">
        <span class="spinner" id="spinner" hidden aria-hidden="true"></span>
        <span class="button-label" id="buttonLabel">Continue</span>
      </button>
      <a id="openButton" class="button secondary" hidden>Return to ACS</a>
      <div id="details" role="status" aria-live="polite"></div>
    </main>
    <script nonce="${nonce}">window.__ACS_DESKTOP_AUTH__ = ${pageConfig};</script>
    <script nonce="${nonce}" type="module">
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
      import {
        getAuth,
        GoogleAuthProvider,
        OAuthProvider,
        signInWithPopup
      } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

      const config = window.__ACS_DESKTOP_AUTH__;
      const params = new URLSearchParams(location.hash.slice(1));
      const transactionId = params.get("t");
      const browserToken = params.get("bt");
      const button = document.querySelector("#continueButton");
      const buttonLabel = document.querySelector("#buttonLabel");
      const spinner = document.querySelector("#spinner");
      const openButton = document.querySelector("#openButton");
      const details = document.querySelector("#details");
      const title = document.querySelector("#title");
      const message = document.querySelector("#message");
      let browserContext;
      let firebaseAuth;

      const providerName = () =>
        browserContext?.provider === "APPLE" ? "Apple" : "Google";

      const setLoading = (loading, label) => {
        button.disabled = loading;
        button.classList.toggle("is-loading", loading);
        spinner.hidden = !loading;
        if (label) buttonLabel.textContent = label;
      };

      const friendlyError = (error) => {
        const code = String(error?.code || "");
        const rawMessage = String(error?.message || "");

        if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) {
          return "The sign-in window was closed. Select Continue to try again.";
        }
        if (code.includes("popup-blocked")) {
          return "Your browser blocked the sign-in window. Allow pop-ups for this page and try again.";
        }
        if (code.includes("network-request-failed")) {
          return "We could not reach the sign-in service. Check your internet connection and try again.";
        }
        if (
          code.includes("unauthorized-domain") ||
          code.includes("app-not-authorized") ||
          rawMessage.includes("requests-from-referer")
        ) {
          return "Google sign-in is temporarily unavailable. Please contact ACS support.";
        }
        if (/expired|no longer pending|invalid authentication link/i.test(rawMessage)) {
          return "This sign-in link has expired. Return to ACS and start again.";
        }
        return "We could not complete sign-in. Please try again.";
      };

      const isPermanentLinkError = (error) =>
        /expired|no longer pending|invalid authentication link/i.test(
          String(error?.message || ""),
        );

      const setError = (error, canRetry = true) => {
        console.error("ACS desktop authentication failed:", error);
        title.textContent = canRetry ? "Sign-in did not finish" : "Start again from ACS";
        message.textContent = canRetry
          ? "Your account was not changed."
          : "For your security, this sign-in link can no longer be used.";
        details.textContent = friendlyError(error);
        details.classList.add("error");
        button.hidden = !canRetry;
        openButton.hidden = true;
        setLoading(false, "Try again");
      };

      const loadContext = async () => {
        if (!transactionId || !browserToken) throw new Error("This authentication link is invalid.");
        const url = new URL(config.apiBaseUrl + "/browser/" + encodeURIComponent(transactionId));
        const response = await fetch(url, {
          headers: {
            "Accept": "application/json",
            "X-Desktop-Auth-Browser-Token": browserToken
          }
        });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.message || "Authentication link expired.");
        return body.data;
      };

      const providerFor = (provider) => {
        if (provider === "GOOGLE") {
          const google = new GoogleAuthProvider();
          google.setCustomParameters({ prompt: "select_account" });
          return google;
        }
        const apple = new OAuthProvider("apple.com");
        apple.addScope("email");
        apple.addScope("name");
        return apple;
      };

      const finish = async () => {
        title.textContent = "Sign in to ACS";
        message.textContent = "Choose your account to continue to the ACS desktop app.";
        button.hidden = false;
        openButton.hidden = true;
        setLoading(true, "Please wait");
        details.classList.remove("error");
        details.textContent = "Opening " + providerName() + " sign-in...";

        try {
          browserContext ||= await loadContext();
          firebaseAuth ||= getAuth(initializeApp(config.firebaseConfig));
          const result = await signInWithPopup(firebaseAuth, providerFor(browserContext.provider));
          const idToken = await result.user.getIdToken(true);
          details.textContent = "Almost there...";

          const response = await fetch(config.apiBaseUrl + "/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ transactionId, browserToken, idToken })
          });
          const body = await response.json();
          if (!response.ok || !body.success) throw new Error(body.message || "Authentication failed.");

          const status = body.data.status;
          const successCopy = {
            READY: {
              title: "You are signed in",
              message: "Return to ACS to continue learning."
            },
            ACCOUNT_LINK_REQUIRED: {
              title: "One more step",
              message: "We found an existing ACS account. Return to the app to verify and link it."
            },
            REGISTRATION_REQUIRED: {
              title: "Finish setting up your account",
              message: "Return to ACS to add your phone number and complete registration."
            }
          };
          const copy = successCopy[status] || {
            title: "Continue in ACS",
            message: "Return to the desktop app to continue."
          };
          title.textContent = copy.title;
          message.textContent = copy.message;
          details.textContent = "You can close this tab after ACS opens.";
          details.classList.remove("error");
          button.hidden = true;
          openButton.hidden = false;
          openButton.href = body.data.deepLink;
          setTimeout(() => { location.href = body.data.deepLink; }, 350);
        } catch (error) {
          setError(error);
        }
      };

      button.addEventListener("click", finish);
      loadContext()
        .then((context) => {
          browserContext = context;
          buttonLabel.textContent = context.provider === "APPLE"
            ? "Continue with Apple"
            : "Continue with Google";
          details.textContent = "Keep the ACS app open while you sign in.";
        })
        .catch((error) => {
          setError(error, !isPermanentLinkError(error));
        });
    </script>
  </body>
</html>`;
};
