import {
  getSession,
  onAuthStateChange,
  getUserRole,
  maskEmail,
  resolveAvatarUrl,
  updateCustomAvatar,
  logout,
  fetchAuthSettings,
  updateAuthSetting,
  fetchAllUserRoles,
  updateUserRole
} from "./auth.js";

import { fetchComments, addComment, subscribeToComments } from "./comments.js";
import { fetchWorks } from "./works.js";

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
const logoutButton = document.getElementById("logoutButton");

const authMethodsItem = document.getElementById("authMethodsItem");
const authMethodsModal = document.getElementById("authMethodsModal");
const closeAuthMethodsModal = document.getElementById("closeAuthMethodsModal");
const authMethodsList = document.getElementById("authMethodsList");
const authMethodsMessage = document.getElementById("authMethodsMessage");

const manageUsersItem = document.getElementById("manageUsersItem");
const manageUsersModal = document.getElementById("manageUsersModal");
const closeManageUsersModal = document.getElementById("closeManageUsersModal");
const userList = document.getElementById("userList");
const userListMessage = document.getElementById("userListMessage");

const METHOD_LABELS = {
  password: "Email & Password",
  magic_link: "Magic Link",
  google: "Google",
  github: "GitHub"
};

const floatingWidget = document.getElementById("floatingWidget");
const widgetToggle = document.getElementById("widgetToggle");
const iconChat = document.getElementById("iconChat");
const iconClose = document.getElementById("iconClose");
const widgetPanel = document.getElementById("widgetPanel");
const commentList = document.getElementById("commentList");
const commentFooter = document.getElementById("commentFooter");
const commentInput = document.getElementById("commentInput");
const sendCommentButton = document.getElementById("sendCommentButton");
const commentLoginPrompt = document.getElementById("commentLoginPrompt");
const emptyState = document.getElementById("emptyState");
const worksGrid = document.getElementById("worksGrid");
const bannerWorks = document.getElementById("bannerWorks");
const previewModal = document.getElementById("previewModal");
const previewTitle = document.getElementById("previewTitle");
const previewIframe = document.getElementById("previewIframe");
const previewOpenNewTab = document.getElementById("previewOpenNewTab");
const closePreviewModal = document.getElementById("closePreviewModal");

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

function toggleAuthMethodsModal(open) {
  authMethodsModal.hidden = !open;
  overlay.classList.toggle("is-visible", open);
  if (open) loadAuthMethods();
}

function toggleManageUsersModal(open) {
  manageUsersModal.hidden = !open;
  overlay.classList.toggle("is-visible", open);
  if (open) loadUserList();
}

async function loadAuthMethods() {
  authMethodsMessage.textContent = "";
  authMethodsList.innerHTML = '<p class="field-hint">Memuat...</p>';

  try {
    const settings = await fetchAuthSettings();
    authMethodsList.innerHTML = "";

    settings.forEach((item) => {
      const row = document.createElement("div");
      row.className = "toggle-row";

      const label = document.createElement("span");
      label.textContent = item.label || METHOD_LABELS[item.method] || item.method;

      const toggle = document.createElement("button");
      toggle.className = `toggle${item.enabled ? " is-on" : ""}`;
      toggle.setAttribute("role", "switch");
      toggle.setAttribute("aria-checked", String(item.enabled));

      toggle.addEventListener("click", async () => {
        const nextEnabled = !toggle.classList.contains("is-on");

        try {
          await updateAuthSetting(item.method, nextEnabled);
          toggle.classList.toggle("is-on", nextEnabled);
          toggle.setAttribute("aria-checked", String(nextEnabled));
          authMethodsMessage.textContent = "";
        } catch (error) {
          console.error(error);
          authMethodsMessage.textContent = "Minimal satu metode login harus tetap aktif.";
          authMethodsMessage.className = "field-hint is-error";
        }
      });

      row.append(label, toggle);
      authMethodsList.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    authMethodsList.innerHTML = '<p class="field-hint is-error">Gagal memuat pengaturan.</p>';
  }
}

async function loadUserList() {
  userListMessage.textContent = "";
  userList.innerHTML = '<p class="field-hint">Memuat...</p>';

  try {
    const rows = await fetchAllUserRoles();
    userList.innerHTML = "";

    if (rows.length === 0) {
      userList.innerHTML = '<p class="field-hint">Belum ada pengguna.</p>';
      return;
    }

    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = `user-row role-${row.role}`;

      const info = document.createElement("div");
      info.className = "user-row-info";

      const emailSpan = document.createElement("span");
      emailSpan.className = "user-row-email";
      emailSpan.textContent =
        currentSession && currentSession.user.email === row.email
          ? `${maskEmail(row.email)} (Anda)`
          : maskEmail(row.email);

      const badge = document.createElement("span");
      badge.className = `role-badge role-badge-${row.role}`;
      badge.textContent = row.role === "admin" ? "Admin" : "Pengguna";

      info.append(emailSpan, badge);

      const select = document.createElement("select");
      select.className = "role-select";
      select.innerHTML = `
        <option value="user">Pengguna</option>
        <option value="admin">Admin</option>
      `;
      select.value = row.role;

      select.addEventListener("change", async () => {
        const newRole = select.value;

        try {
          await updateUserRole(row.email, newRole);
          item.className = `user-row role-${newRole}`;
          badge.className = `role-badge role-badge-${newRole}`;
          badge.textContent = newRole === "admin" ? "Admin" : "Pengguna";
          userListMessage.textContent = "Role diperbarui.";
          userListMessage.className = "field-hint is-success";
        } catch (error) {
          console.error(error);
          select.value = row.role;
          userListMessage.textContent = "Gagal mengubah role (minimal harus ada satu admin).";
          userListMessage.className = "field-hint is-error";
        }
      });

      item.append(info, select);
      userList.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    userList.innerHTML = '<p class="field-hint is-error">Gagal memuat daftar pengguna.</p>';
  }
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

function getExpandedSize() {
  return {
    width: Math.min(340, window.innerWidth * 0.9),
    height: Math.min(480, window.innerHeight * 0.7)
  };
}

function clampWidgetPosition() {
  const { width, height } = getExpandedSize();
  const rect = floatingWidget.getBoundingClientRect();

  const maxLeft = Math.max(window.innerWidth - width - 8, 8);
  const maxTop = Math.max(window.innerHeight - height - 8, 8);

  const left = Math.min(Math.max(rect.left, 8), maxLeft);
  const top = Math.min(Math.max(rect.top, 8), maxTop);

  floatingWidget.style.left = `${left}px`;
  floatingWidget.style.top = `${top}px`;
  floatingWidget.style.right = "auto";
  floatingWidget.style.bottom = "auto";
}

function expandWidget() {
  floatingWidget.classList.add("is-expanded");
  widgetPanel.hidden = false;
  iconChat.classList.add("is-hidden");
  iconClose.classList.remove("is-hidden");
  widgetToggle.setAttribute("aria-label", "Tutup komentar");
  clampWidgetPosition();
  loadComments();
}

function collapseWidget() {
  floatingWidget.classList.remove("is-expanded");
  widgetPanel.hidden = true;
  iconChat.classList.remove("is-hidden");
  iconClose.classList.add("is-hidden");
  widgetToggle.setAttribute("aria-label", "Buka komentar");
}

function toggleWidget() {
  if (floatingWidget.classList.contains("is-expanded")) collapseWidget();
  else expandWidget();
}

window.addEventListener("resize", () => {
  if (floatingWidget.classList.contains("is-expanded")) clampWidgetPosition();
});

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

widgetToggle.addEventListener("mousedown", onPointerDown);
widgetToggle.addEventListener("touchstart", onPointerDown, { passive: true });

widgetToggle.addEventListener("click", () => {
  if (floatingWidget.classList.contains("is-expanded")) collapseWidget();
});

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
  toggleAuthMethodsModal(false);
  toggleManageUsersModal(false);
  closeWorkPreview();
});

closeAuthMethodsModal.addEventListener("click", () => toggleAuthMethodsModal(false));
closeManageUsersModal.addEventListener("click", () => toggleManageUsersModal(false));

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

logoutButton.addEventListener("click", async () => {
  try {
    await logout();
    toggleAccountModal(false);
    window.location.reload();
  } catch (error) {
    console.error(error);
    showAccountMessage("Gagal keluar.", "is-error");
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

  const manageContentItem = document.getElementById("manageContentItem");
  if (manageContentItem) {
    manageContentItem.onclick = () => {
      window.location.href = "admin/kelola-konten.html";
    };
  }

  authMethodsItem.onclick = () => {
    toggleDrawer(false);
    toggleAuthMethodsModal(true);
  };

  manageUsersItem.onclick = () => {
    toggleDrawer(false);
    toggleManageUsersModal(true);
  };
}

function resolveWorkUrl(path) {
  return /^https?:\/\//i.test(path) ? path : `/${path.replace(/^\//, "")}`;
}

function openWorkPreview(work) {
  const url = resolveWorkUrl(work.path);

  previewTitle.textContent = work.title;
  previewOpenNewTab.href = url;
  previewIframe.src = url;

  previewModal.style.width = work.iframe_width || "";
  previewModal.style.height = work.iframe_height || "";

  previewModal.hidden = false;
  overlay.classList.add("is-visible");
}

function closeWorkPreview() {
  previewModal.hidden = true;
  previewIframe.src = "";
  previewModal.style.width = "";
  previewModal.style.height = "";
  overlay.classList.remove("is-visible");
}

closePreviewModal.addEventListener("click", closeWorkPreview);

function renderBanner(work) {
  const banner = document.createElement("div");
  banner.className = "work-banner";

  banner.innerHTML = `
    <div class="work-banner-header">
      <h3></h3>
      <p></p>
    </div>
    <iframe class="work-banner-iframe" loading="lazy"></iframe>
  `;

  banner.querySelector("h3").textContent = work.title;
  banner.querySelector("p").textContent = work.description || "";

  const iframe = banner.querySelector("iframe");
  iframe.src = resolveWorkUrl(work.path);
  iframe.title = work.title;

  if (work.iframe_width) {
    iframe.style.width = work.iframe_width;
    banner.style.maxWidth = work.iframe_width;
  }
  if (work.iframe_height) iframe.style.height = work.iframe_height;

  return banner;
}

function renderCard(work) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "work-card";

  card.innerHTML = `
    <h3></h3>
    <p></p>
  `;

  card.querySelector("h3").textContent = work.title;
  card.querySelector("p").textContent = work.description || "";

  card.addEventListener("click", () => openWorkPreview(work));

  return card;
}

async function loadWorks() {
  try {
    const works = await fetchWorks();

    if (works.length === 0) {
      emptyState.hidden = false;
      bannerWorks.hidden = true;
      worksGrid.hidden = true;
      return;
    }

    const bannerItems = works.filter((work) => work.display_mode === "banner");
    const clickItems = works.filter((work) => work.display_mode !== "banner");

    bannerWorks.innerHTML = "";
    bannerItems.forEach((work) => bannerWorks.appendChild(renderBanner(work)));

    worksGrid.innerHTML = "";
    clickItems.forEach((work) => worksGrid.appendChild(renderCard(work)));

    emptyState.hidden = true;
    bannerWorks.hidden = bannerItems.length === 0;
    worksGrid.hidden = clickItems.length === 0;
  } catch (error) {
    console.error(error);
  }
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
loadWorks();
