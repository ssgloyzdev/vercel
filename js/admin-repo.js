import { getSession, getUserRole } from "./auth.js";

const HOME_URL = "../index.html";

const backButton = document.getElementById("backButton");
const newFileButton = document.getElementById("newFileButton");
const newFolderButton = document.getElementById("newFolderButton");
const deleteFolderButton = document.getElementById("deleteFolderButton");
const fileList = document.getElementById("fileList");
const currentFileLabel = document.getElementById("currentFileLabel");
const editorTextarea = document.getElementById("editorTextarea");
const deleteFileButton = document.getElementById("deleteFileButton");
const saveFileButton = document.getElementById("saveFileButton");
const adminMessage = document.getElementById("adminMessage");

let accessToken = null;
let currentFile = null;

function showMessage(text, type) {
  adminMessage.textContent = text;
  adminMessage.className = `field-hint ${type || ""}`;
}

function authHeaders(extra) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(extra || {})
  };
}

async function apiRequest(path, options) {
  const opts = options || {};

  const res = await fetch(path, {
    ...opts,
    headers: authHeaders({
      "Content-Type": "application/json",
      ...(opts.headers || {})
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data;
}

function setCurrentFile(path, sha) {
  currentFile = path ? { path, sha: sha || null } : null;
  currentFileLabel.textContent = path || "Belum ada file dipilih";
  saveFileButton.disabled = !path;
  deleteFileButton.disabled = !(path && sha);
}

function renderFileList(files) {
  fileList.innerHTML = "";

  files.forEach((file) => {
    const row = document.createElement("div");
    row.className = "file-row";

    row.innerHTML = `
      <button class="file-path">${file.path}</button>
      <button class="file-delete" aria-label="Hapus file">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
      </button>
    `;

    row.querySelector(".file-path").addEventListener("click", () => openFile(file.path));
    row.querySelector(".file-delete").addEventListener("click", () => deleteFileAt(file.path));

    fileList.appendChild(row);
  });
}

async function loadFileList() {
  try {
    const data = await apiRequest("/api/repo/tree");
    renderFileList(data.files);
  } catch (error) {
    showMessage(error.message, "is-error");
  }
}

async function openFile(path) {
  try {
    showMessage("", "");
    const data = await apiRequest(`/api/repo/file?path=${encodeURIComponent(path)}`);
    editorTextarea.value = data.content;
    setCurrentFile(data.path, data.sha);
  } catch (error) {
    showMessage(error.message, "is-error");
  }
}

async function deleteFileAt(path) {
  if (!window.confirm(`Hapus file "${path}"?`)) return;

  try {
    const data = await apiRequest(`/api/repo/file?path=${encodeURIComponent(path)}`);

    await apiRequest("/api/repo/file", {
      method: "DELETE",
      body: JSON.stringify({ path, sha: data.sha, message: `delete ${path}` })
    });

    if (currentFile && currentFile.path === path) {
      setCurrentFile(null);
      editorTextarea.value = "";
    }

    showMessage("File berhasil dihapus.", "is-success");
    loadFileList();
  } catch (error) {
    showMessage(error.message, "is-error");
  }
}

newFileButton.addEventListener("click", () => {
  const path = window.prompt("Path file baru (contoh: blog/index.html):");
  if (!path) return;

  setCurrentFile(path, null);
  editorTextarea.value = "";
  editorTextarea.focus();
});

newFolderButton.addEventListener("click", async () => {
  const path = window.prompt("Nama folder baru (contoh: blog):");
  if (!path) return;

  try {
    await apiRequest("/api/repo/folder", {
      method: "POST",
      body: JSON.stringify({ path })
    });

    showMessage("Folder berhasil dibuat.", "is-success");
    loadFileList();
  } catch (error) {
    showMessage(error.message, "is-error");
  }
});

deleteFolderButton.addEventListener("click", async () => {
  const path = window.prompt("Path folder yang mau dihapus (contoh: blog):");
  if (!path) return;

  if (!window.confirm(`Hapus folder "${path}" beserta semua isinya?`)) return;

  try {
    const data = await apiRequest("/api/repo/folder", {
      method: "DELETE",
      body: JSON.stringify({ path, message: `delete folder ${path}` })
    });

    showMessage(`Folder dihapus, ${data.filesRemoved} file ikut terhapus.`, "is-success");
    loadFileList();
  } catch (error) {
    showMessage(error.message, "is-error");
  }
});

saveFileButton.addEventListener("click", async () => {
  if (!currentFile) return;

  try {
    saveFileButton.disabled = true;

    const data = await apiRequest("/api/repo/file", {
      method: "PUT",
      body: JSON.stringify({
        path: currentFile.path,
        content: editorTextarea.value,
        sha: currentFile.sha,
        message: `update ${currentFile.path}`
      })
    });

    setCurrentFile(data.path, data.sha);
    showMessage("Tersimpan & sedang di-deploy Vercel.", "is-success");
    loadFileList();
  } catch (error) {
    showMessage(error.message, "is-error");
  } finally {
    saveFileButton.disabled = false;
  }
});

deleteFileButton.addEventListener("click", async () => {
  if (!currentFile) return;
  await deleteFileAt(currentFile.path);
});

backButton.addEventListener("click", () => {
  window.location.href = HOME_URL;
});

async function init() {
  const session = await getSession();

  if (!session) {
    window.location.href = "../register/login.html";
    return;
  }

  const role = await getUserRole(session.user.email);

  if (role !== "admin") {
    window.location.href = HOME_URL;
    return;
  }

  accessToken = session.access_token;
  loadFileList();
}

init();
