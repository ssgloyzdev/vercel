import {
  login,
  loginWithGoogle,
  loginWithGitHub,
  loginWithMagicLink,
  getSession,
  fetchAuthSettings
} from "./auth.js";

const HOME_URL = "../index.html";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordGroup = document.getElementById("passwordGroup");
const loginButton = document.getElementById("loginButton");
const googleButton = document.getElementById("googleButton");
const githubButton = document.getElementById("githubButton");
const magicLinkButton = document.getElementById("magicLinkButton");
const magicLinkText = document.querySelector(".magic-link-text");
const divider = document.querySelector(".divider");
const oauthButtons = document.querySelector(".oauth-buttons");
const message = document.getElementById("message");

let authMethods = { password: true, magic_link: true, google: true, github: true };

async function applyAuthMethods() {
  try {
    const settings = await fetchAuthSettings();
    settings.forEach((item) => {
      authMethods[item.method] = item.enabled;
    });
  } catch (error) {
    console.error(error);
  }

  passwordGroup.hidden = !authMethods.password;
  loginButton.hidden = !authMethods.password;
  magicLinkText.hidden = !authMethods.magic_link;
  googleButton.hidden = !authMethods.google;
  githubButton.hidden = !authMethods.github;

  const noOauth = !authMethods.google && !authMethods.github;
  divider.hidden = noOauth;
  oauthButtons.hidden = noOauth;
}

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type}`;
}

function setLoading(button, loading, text) {
  button.disabled = loading;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!authMethods.password) {
    showMessage("Login dengan email & password sedang dinonaktifkan.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Email dan password wajib diisi.");
    return;
  }

  try {
    setLoading(loginButton, true, "Logging in...");
    await login(email, password);
    showMessage("Login berhasil!", "success");
    window.location.href = HOME_URL;
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Login gagal.");
  } finally {
    setLoading(loginButton, false);
  }
});

async function handleOAuth(button, action, fallbackMessage) {
  try {
    setLoading(button, true, "Connecting...");
    await action();
  } catch (error) {
    console.error(error);
    showMessage(error.message || fallbackMessage);
    setLoading(button, false);
  }
}

googleButton.addEventListener("click", () =>
  handleOAuth(googleButton, loginWithGoogle, "Login dengan Google gagal.")
);

githubButton.addEventListener("click", () =>
  handleOAuth(githubButton, loginWithGitHub, "Login dengan GitHub gagal.")
);

magicLinkButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();

  if (!email) {
    showMessage("Isi email dulu untuk magic link.");
    return;
  }

  try {
    setLoading(magicLinkButton, true, "Mengirim...");
    await loginWithMagicLink(email);
    showMessage("Link login sudah dikirim, cek email kamu.", "success");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Gagal mengirim magic link.");
  } finally {
    setLoading(magicLinkButton, false);
  }
});

async function checkSession() {
  try {
    const session = await getSession();
    if (session) window.location.href = HOME_URL;
  } catch (error) {
    console.error("Session check error:", error);
  }
}

applyAuthMethods();
checkSession();
