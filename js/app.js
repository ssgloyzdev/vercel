import { getSession, onAuthStateChange } from "./auth.js";

const LOGIN_URL = "register/login.html";

const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const openDrawer = document.getElementById("openDrawer");
const closeDrawer = document.getElementById("closeDrawer");
const loginButton = document.getElementById("loginButton");
const userChip = document.getElementById("userChip");
const adminSection = document.getElementById("adminSection");
const accountItem = document.getElementById("accountItem");
const commentsItem = document.getElementById("commentsItem");

function toggleDrawer(open) {
  drawer.classList.toggle("is-open", open);
  overlay.classList.toggle("is-visible", open);
}

function goToLogin() {
  window.location.href = LOGIN_URL;
}

function requireAuth(session, action) {
  if (!session) {
    goToLogin();
    return;
  }

  action();
}

openDrawer.addEventListener("click", () => toggleDrawer(true));
closeDrawer.addEventListener("click", () => toggleDrawer(false));
overlay.addEventListener("click", () => toggleDrawer(false));
loginButton.addEventListener("click", goToLogin);

document.querySelectorAll(".toggle").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const isOn = toggle.classList.toggle("is-on");
    toggle.setAttribute("aria-checked", isOn);
  });
});

function renderAuthState(session) {
  loginButton.hidden = !!session;
  userChip.hidden = !session;
  adminSection.hidden = !session;

  accountItem.onclick = () => requireAuth(session, () => {});
  commentsItem.onclick = () => requireAuth(session, () => {});
}

async function initAuthState() {
  try {
    const session = await getSession();
    renderAuthState(session);
  } catch (error) {
    console.error("Session check error:", error);
    renderAuthState(null);
  }
}

onAuthStateChange((_event, session) => renderAuthState(session));
initAuthState();
