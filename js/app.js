import {
  getSession,
  onAuthStateChange,
  getUserRole,
  maskEmail,
  resolveAvatarUrl,
  updateCustomAvatar
} from "./auth.js";

import { fetchComments, addComment, subscribeToComments } from "./comments.js";

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

const floatingWidget = document.getElementById("floatingWidget");
const widgetIcon = document.getElementById("widgetIcon");
const widgetPanel = document.getElementById("widgetPanel");
const closeWidget = document.getElementById("closeWidget");
const commentList = document.getElementById("commentList");
const commentFooter = document.getElementById("commentFooter");
const commentInput = document.getElementById("commentInput");
const sendCommentButton = document.getElementById("sendCommentButton");
const commentLoginPrompt = document.getElementById("commentLoginPrompt");

let currentSession = null;
let commentsLoaded = false;
let realtimeChannel = null;

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

function relativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  return "lebih dari 1 hari";
}

function renderComment(comment) {
  const item = document.createElement("div");
  item.className = "comment-item";

  item.innerHTML = `
    <div class="comment-meta">
      <span class="comment-email">${maskEmail(comment.email)}</span>
      <span class="comment-time">${relativeTime(comment.created_at)}</span>
    </div>
    <div class="comment-content"></div>
  `;

  item.querySelector(".comment-content").textContent = comment.content;
  return item;
}

function renderEmptyState() {
  commentList.innerHTML = '<p class="comment-empty">Belum ada komentar, jadi yang pertama!</p>';
}

async function loadComments() {
  if (commentsLoaded) return;
  commentsLoaded = true;

  try {
    const comments = await fetchComments();
    commentList.innerHTML = "";

    if (comments.length === 0) {
      renderEmptyState();
    } else {
      comments.forEach((comment) => commentList.appendChild(renderComment(comment)));
      commentList.scrollTop = commentList.scrollHeight;
    }

    realtimeChannel = subscribeToComments((comment) => {
      const emptyState = commentList.querySelector(".comment-empty");
      if (emptyState) emptyState.remove();

      commentList.appendChild(renderComment(comment));
      commentList.scrollTop = commentList.scrollHeight;
    });
  } catch (error) {
    console.error(error);
    commentList.innerHTML = '<p class="comment-empty">Gagal memuat komentar.</p>';
    commentsLoaded = false;
  }
}

function clampWidgetPosition() {
  const rect = floatingWidget.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width - 8;
  const maxTop = window.innerHeight - rect.height - 8;

  const left = Math.min(Math.max(rect.left, 8), Math.max(maxLeft, 8));
  const top = Math.min(Math.max(rect.top, 8), Math.max(maxTop, 8));

  floatingWidget.style.left = `${left}px`;
  floatingWidget.style.top = `${top}px`;
  floatingWidget.style.right = "auto";
  floatingWidget.style.bottom = "auto";
}

function expandWidget() {
  floatingWidget.classList.add("is-expanded");
  widgetPanel.hidden = false;
  clampWidgetPosition();
  loadComments();
}

function collapseWidget() {
  floatingWidget.classList.remove("is-expanded");
  widgetPanel.hidden = true;
}

function toggleWidget() {
  if (floatingWidget.classList.contains("is-expanded")) collapseWidget();
  else expandWidget();
}

let isDragging = false;
let dragMoved = false;
let startX = 0;
let startY = 0;
let originX = 0;
let originY = 0;

function onPointerDown(event) {
  if (floatingWidget.classList.contains("is-expanded")) return;

  isDragging = true;
  dragMoved = false;

  const point = event.touches ? event.touches[0] : event;
  startX = point.clientX;
  startY = point.clientY;

  const rect = floatingWidget.getBoundingClientRect();
  originX = rect.left;
  originY = rect.top;

  document.addEventListener("mousemove", onPointerMove);
  document.addEventListener("touchmove", onPointerMove, { passive: false });
  document.addEventListener("mouseup", onPointerUp);
  document.addEventListener("touchend", onPointerUp);
}

function onPointerMove(event) {
  if (!isDragging) return;
  if (event.cancelable) event.preventDefault();

  const point = event.touches ? event.touches[0] : event;
  const dx = point.clientX - startX;
  const dy = point.clientY - startY;

  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;

  const rect = floatingWidget.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width;
  const maxTop = window.innerHeight - rect.height;

  const nextLeft = Math.min(Math.max(originX + dx, 0), maxLeft);
  const nextTop = Math.min(Math.max(originY + dy, 0), maxTop);

  floatingWidget.style.left = `${nextLeft}px`;
  floatingWidget.style.top = `${nextTop}px`;
  floatingWidget.style.right = "auto";
  floatingWidget.style.bottom = "auto";
}

function onPointerUp() {
  isDragging = false;

  document.removeEventListener("mousemove", onPointerMove);
  document.removeEventListener("touchmove", onPointerMove);
  document.removeEventListener("mouseup", onPointerUp);
  document.removeEventListener("touchend", onPointerUp);

  if (!dragMoved) toggleWidget();
}

widgetIcon.addEventListener("mousedown", onPointerDown);
widgetIcon.addEventListener("touchstart", onPointerDown, { passive: true });
closeWidget.addEventListener("click", collapseWidget);

sendCommentButton.addEventListener("click", async () => {
  const content = commentInput.value.trim();
  if (!content) return;

  try {
    sendCommentButton.disabled = true;
    await addComment(content);
    commentInput.value = "";
  } catch (error) {
    console.error(error);
  } finally {
    sendCommentButton.disabled = false;
  }
});

commentInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendCommentButton.click();
});

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

  commentFooter.hidden = !session;
  commentLoginPrompt.hidden = !!session;
  commentLoginPrompt.onclick = goToLogin;

  accountItem.onclick = () => requireAuth(session, () => openAccountSettings(session));
  commentsItem.onclick = () => {
    toggleDrawer(false);
    expandWidget();
  };
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
