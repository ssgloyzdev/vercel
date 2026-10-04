import {
  register,
  loginWithGoogle,
  loginWithGitHub,
  fetchAuthSettings
} from "./auth.js";

const HOME_URL = "../index.html";

const registerForm = document.querySelector("#registerForm");

const email = document.querySelector("#email");
const password = document.querySelector("#password");
const confirmPassword = document.querySelector("#confirmPassword");

const registerButton = document.querySelector("#registerButton");
const googleButton = document.querySelector("#googleButton");
const githubButton = document.querySelector("#githubButton");
const divider = document.querySelector(".divider");
const oauthButtons = document.querySelector(".oauth-buttons");

const message = document.querySelector("#message");

let authMethods = { password: true, magic_link: true, google: true, github: true };

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type}`;
}

async function applyAuthMethods() {
  try {
    const settings = await fetchAuthSettings();
    settings.forEach((item) => {
      authMethods[item.method] = item.enabled;
    });
  } catch (error) {
    console.error(error);
  }

  registerForm.hidden = !authMethods.password;
  googleButton.hidden = !authMethods.google;
  githubButton.hidden = !authMethods.github;

  const noOauth = !authMethods.google && !authMethods.github;
  divider.hidden = noOauth;
  oauthButtons.hidden = noOauth;

  if (!authMethods.password && noOauth) {
    showMessage("Pendaftaran akun baru sedang dinonaktifkan.");
  }
}

async function handleRegister() {
  if (!authMethods.password) {
    showMessage("Pendaftaran dengan email & password sedang dinonaktifkan.");
    return;
  }

  const emailValue = email.value.trim();
  const passwordValue = password.value;
  const confirmPasswordValue = confirmPassword.value;

  if (!emailValue || !passwordValue || !confirmPasswordValue) {
    showMessage("Semua field wajib diisi.");
    return;
  }

  if (passwordValue.length < 6) {
    showMessage("Password minimal 6 karakter.");
    return;
  }

  if (passwordValue !== confirmPasswordValue) {
    showMessage("Password tidak cocok.");
    return;
  }

  registerButton.disabled = true;
  registerButton.textContent = "Mendaftarkan...";

  try {
    const data = await register(
      emailValue,
      passwordValue
    );

    if (!data.session) {
      showMessage(
        "Pendaftaran berhasil. Silakan cek email untuk verifikasi.",
        "success"
      );
    } else {
      window.location.href = HOME_URL;
    }
  } catch (error) {
    showMessage(error.message);
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = "Daftar";
  }
}

async function handleGoogleRegister() {
  googleButton.disabled = true;
  googleButton.textContent = "Connecting...";

  try {
    await loginWithGoogle();
  } catch (error) {
    showMessage(error.message);

    googleButton.disabled = false;
    googleButton.textContent = "Daftar dengan Google";
  }
}

async function handleGitHubRegister() {
  githubButton.disabled = true;
  githubButton.textContent = "Connecting...";

  try {
    await loginWithGitHub();
  } catch (error) {
    showMessage(error.message);

    githubButton.disabled = false;
    githubButton.textContent = "Daftar dengan GitHub";
  }
}

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleRegister();
});

googleButton.addEventListener(
  "click",
  handleGoogleRegister
);

githubButton.addEventListener(
  "click",
  handleGitHubRegister
);

applyAuthMethods();
