import {
  getSession,
  onAuthStateChange,
  getUserRole,
  maskEmail,
  resolveAvatarUrl,
  updateCustomAvatar
} from "./auth.js";

const LOGIN_URL = "register/login.html";
const DEFAULT_AVATAR = "assets/default-avatar.png";

const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const openDrawer = document.getElementById("openDrawer");
const closeDrawer = document.getElementById("closeDrawer");
const loginButton = document.getElementById("loginButton");
const userChip = document.getElementById("userChip");
const userChipEmail = document.getElementById("userChipEmail");
const userChipAvatar = userChip.querySelector(".avatar");
const drawerAccountAvatar = document.querySelector("#accountItem .avatar");
const adminSection = document.getElementById("adminSection");
const accountItem = document.getElementById("accountItem");
const commentsItem = document.getElementById("commentsItem");

const accountModal = document.getElementById("accountModal");
const closeAccountModal = document.getElementById("closeAccountModal");
const accountAvatarPreview = document.getElementById("accountAvatarPreview");
const accountEmail = document.getElementById("accountEmail");
const avatarUrlInput = document.getElementById("avatarUrlInput");
const saveAvatarButton = document.getElementById("saveAvatarButton");
const resetAvatarButton = document.getElementById("resetAvatarButton");
const accountMessage = document.getElementById("accountMessage");

let currentSession = null;

function toggleDrawer(open) {
  drawer.classList.toggle("is-open", open);
  overlay.classList.toggle("is-visible", open);
}

function toggleAccountModal(open) {
  accountModal.hidden = !open;
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

function setAvatarSrc(imgEl, url) {
  imgEl.src = url || DEFAULT_AVATAR;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = DEFAULT_AVATAR;
  };
}

function applyAvatar(user) {
  const url = resolveAvatarUrl(user);
  setAvatarSrc(userChipAvatar, url);
  setAvatarSrc(drawerAccountAvatar, url);
  setAvatarSrc(accountAvatarPreview, url);
}

function showAccountMessage(text, type) {
  accountMessage.textContent = text;
  accountMessage.className = `field-hint ${type || ""}`;
}

function openAccountSettings(session) {
  toggleDrawer(false);
  showAccountMessage("", "");
  accountEmail.textContent = maskEmail(session.user.email);
  avatarUrlInput.value = session.user.user_metadata?.custom_avatar_url || "";
  setAvatarSrc(accountAvatarPreview, resolveAvatarUrl(session.user));
  toggleAccountModal(true);
}

openDrawer.addEventListener("click", () => toggleDrawer(true));
closeDrawer.addEventListener("click", () => toggleDrawer(false));
closeAccountModal.addEventListener("click", () => toggleAccountModal(false));
loginButton.addEventListener("click", goToLogin);

overlay.addEventListener("click", () => {
  toggleDrawer(false);
  toggleAccountModal(false);
});

document.querySelectorAll(".toggle").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const isOn = toggle.classList.toggle("is-on");
    toggle.setAttribute("aria-checked", isOn);
  });
});

saveAvatarButton.addEventListener("click", async () => {
  try {
    const user = await updateCustomAvatar(avatarUrlInput.value.trim());
    currentSession.user = user;
    applyAvatar(user);
    showAccountMessage("Foto profil disimpan.", "is-success");
  } catch (error) {
    console.error(error);
    showAccountMessage("Gagal menyimpan foto profil.", "is-error");
  }
});

resetAvatarButton.addEventListener("click", async () => {
  try {
    const user = await updateCustomAvatar(null);
    currentSession.user = user;
    avatarUrlInput.value = "";
    applyAvatar(user);
    showAccountMessage("Kembali ke foto default.", "is-success");
  } catch (error) {
    console.error(error);
    showAccountMessage("Gagal mengatur ulang foto profil.", "is-error");
  }
});

async function renderAuthState(session) {
  currentSession = session;

  loginButton.hidden = !!session;
  userChip.hidden = !session;
  userChipEmail.textContent = session ? maskEmail(session.user.email) : "Pengguna";

  applyAvatar(session ? session.user : null);

  const role = session ? await getUserRole(session.user.email) : "user";
  adminSection.hidden = role !== "admin";

  accountItem.onclick = () => requireAuth(session, () => openAccountSettings(session));
  commentsItem.onclick = () => requireAuth(session, () => {});
}

async function initAuthState() {
  try {
    const session = await getSession();
    await renderAuthState(session);
  } catch (error) {
    console.error("Session check error:", error);
    await renderAuthState(null);
  }
}

onAuthStateChange((_event, session) => renderAuthState(session));
initAuthState();
