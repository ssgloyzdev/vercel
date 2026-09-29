import {
  register,
  loginWithGoogle,
  loginWithGitHub
} from "./auth.js";

const form = document.querySelector("#registerForm");

const email = document.querySelector("#email");
const password = document.querySelector("#password");
const confirmPassword = document.querySelector("#confirmPassword");

const registerButton = document.querySelector("#registerButton");
const googleButton = document.querySelector("#googleButton");
const githubButton = document.querySelector("#githubButton");

const message = document.querySelector("#message");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type}`;
}

async function handleRegister() {
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
      window.location.href = "../index.html";
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

form.addEventListener("submit", (event) => {
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