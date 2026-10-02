import { getSession, getUserRole } from "./auth.js";
import { fetchWorks, addWork, deleteWork } from "./works.js";

const HOME_URL = "../index.html";

const backButton = document.getElementById("backButton");
const newFileButton = document.getElementById("newFileButton");
const newFolderButton = document.getElementById("newFolderButton");
const breadcrumb = document.getElementById("breadcrumb");
const fileList = document.getElementById("fileList");
const currentFileLabel = document.getElementById("currentFileLabel");
const editorTextarea = document.getElementById("editorTextarea");
const deleteFileButton = document.getElementById("deleteFileButton");
const saveFileButton = document.getElementById("saveFileButton");
const adminMessage = document.getElementById("adminMessage");
const addWorkButton = document.getElementById("addWorkButton");
const worksManageList = document.getElementById("worksManageList");

let accessToken = null;
let currentFile = null;
let currentPath = "";
let allFiles = [];

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

const folderIconSvg =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

const fileIconSvg =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';

const trashIconSvg =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';

function renderBreadcrumb() {
  breadcrumb.innerHTML = "";

  const rootButton = document.createElement("button");
  rootButton.textContent = "root";
  rootButton.addEventListener("click", () => {
    currentPath = "";
    renderFileBrowser();
  });
  breadcrumb.appendChild(rootButton);

  if (!currentPath) return;

  const segments = currentPath.split("/");
  let builtPath = "";

  segments.forEach((segment, index) => {
    builtPath = builtPath ? `${builtPath}/${segment}` : segment;

    const separator = document.createElement("span");
    separator.className = "separator";
    separator.textContent = "/";
    breadcrumb.appendChild(separator);

    if (index === segments.length - 1) {
      const current = document.createElement("span");
      current.className = "current";
      current.textContent = segment;
      breadcrumb.appendChild(current);
      return;
    }

    const targetPath = builtPath;
    const segmentButton = document.createElement("button");
    segmentButton.textContent = segment;
    segmentButton.addEventListener("click", () => {
      currentPath = targetPath;
      renderFileBrowser();
    });
    breadcrumb.appendChild(segmentButton);
  });
}

function getCurrentLevelEntries() {
  const prefix = currentPath ? `${currentPath}/` : "";
  const folders = new Map();
  const files = [];

  allFiles.forEach((file) => {
    if (!file.path.startsWith(prefix)) return;

    const remainder = file.path.slice(prefix.length);
    if (!remainder) return;

    const slashIndex = remainder.indexOf("/");

    if (slashIndex === -1) {
      files.push({ name: remainder, path: file.path });
    } else {
      const folderName = remainder.slice(0, slashIndex);
      folders.set(folderName, `${prefix}${folderName}`);
    }
  });

  const folderEntries = Array.from(folders.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, path]) => ({ type: "folder", name, path }));

  const fileEntries = files
    .filter((file) => file.name !== ".gitkeep")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((file) => ({ type: "file", name: file.name, path: file.path }));

  return [...folderEntries, ...fileEntries];
}

function renderFileBrowser() {
  renderBreadcrumb();
  fileList.innerHTML = "";

  const entries = getCurrentLevelEntries();

  if (entries.length === 0) {
    fileList.innerHTML = '<p class="comment-empty">Folder ini kosong.</p>';
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "file-row";

    const icon = entry.type === "folder" ? folderIconSvg : fileIconSvg;

    row.innerHTML = `
      <button class="file-path"><span class="row-icon">${icon}</span>${entry.name}</button>
      <button class="file-delete" aria-label="Hapus ${entry.type === "folder" ? "folder" : "file"}">
        ${trashIconSvg}
      </button>
    `;

    row.querySelector(".file-path").addEventListener("click", () => {
      if (entry.type === "folder") {
        currentPath = entry.path;
        renderFileBrowser();
      } else {
        openFile(entry.path);
      }
    });

    row.querySelector(".file-delete").addEventListener("click", () => {
      if (entry.type === "folder") {
        deleteFolderAt(entry.path);
      } else {
        deleteFileAt(entry.path);
      }
    });

    fileList.appendChild(row);
  });
}

async function loadFileList() {
  try {
    const data = await apiRequest("/api/repo/tree");
    allFiles = data.files;
    renderFileBrowser();
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
  const prefix = currentPath ? `${currentPath}/` : "";
  const name = window.prompt("Nama file baru:", prefix);
  if (!name) return;

  setCurrentFile(name, null);
  editorTextarea.value = "";
  editorTextarea.focus();
});

newFolderButton.addEventListener("click", async () => {
  const prefix = currentPath ? `${currentPath}/` : "";
  const name = window.prompt("Nama folder baru:", prefix);
  if (!name) return;

  try {
    await apiRequest("/api/repo/folder", {
      method: "POST",
      body: JSON.stringify({ path: name })
    });

    showMessage("Folder berhasil dibuat.", "is-success");
    loadFileList();
  } catch (error) {
    showMessage(error.message, "is-error");
  }
});

async function deleteFolderAt(path) {
  if (!window.confirm(`Hapus folder "${path}" beserta semua isinya?`)) return;

  try {
    const data = await apiRequest("/api/repo/folder", {
      method: "DELETE",
      body: JSON.stringify({ path, message: `delete folder ${path}` })
    });

    showMessage(`Folder dihapus, ${data.filesRemoved} file ikut terhapus.`, "is-success");

    if (currentPath === path || currentPath.startsWith(`${path}/`)) {
      currentPath = path.split("/").slice(0, -1).join("/");
    }

    loadFileList();
  } catch (error) {
    showMessage(error.message, "is-error");
  }
}

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

async function loadWorksList() {
  try {
    const works = await fetchWorks();
    worksManageList.innerHTML = "";

    works.forEach((work) => {
      const row = document.createElement("div");
      row.className = "file-row";

      row.innerHTML = `
        <div class="work-row-info">
          <span class="work-title"></span>
          <span class="work-path"></span>
        </div>
        <button class="file-delete" aria-label="Hapus karya">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      `;

      const sizeLabel = work.iframe_width || work.iframe_height
        ? ` · ${work.iframe_width || "auto"}×${work.iframe_height || "auto"}`
        : "";

      row.querySelector(".work-title").textContent = work.title;
      row.querySelector(".work-path").textContent =
        `${work.path} · ${work.display_mode === "banner" ? "banner" : "klik"}${sizeLabel}`;

      row.querySelector(".file-delete").addEventListener("click", async () => {
        if (!window.confirm(`Hapus karya "${work.title}" dari beranda?`)) return;

        try {
          await deleteWork(work.id);
          showMessage("Karya dihapus dari beranda.", "is-success");
          loadWorksList();
        } catch (error) {
          showMessage(error.message, "is-error");
        }
      });

      worksManageList.appendChild(row);
    });
  } catch (error) {
    showMessage(error.message, "is-error");
  }
}

addWorkButton.addEventListener("click", async () => {
  const title = window.prompt("Judul karya:");
  if (!title) return;

  const path = window.prompt("URL lengkap karya (contoh: https://view-xxxx.vercel.app/blog):");
  if (!path) return;

  const description = window.prompt("Deskripsi singkat (boleh kosong):") || "";

  const modeInput = (
    window.prompt('Tampilkan sebagai "klik" (kartu, buka pas diklik) atau "banner" (langsung tampil)?', "klik") || ""
  ).trim().toLowerCase();

  const displayMode = modeInput.startsWith("banner") ? "banner" : "click";

  const iframeWidth = window.prompt(
    "Lebar iframe custom (contoh: 600px, 100%; kosongkan untuk default):",
    ""
  ) || "";

  const iframeHeight = window.prompt(
    "Tinggi iframe custom (contoh: 500px; kosongkan untuk default):",
    ""
  ) || "";

  try {
    await addWork(title, path, description, displayMode, iframeWidth, iframeHeight);
    showMessage("Karya ditambahkan ke beranda.", "is-success");
    loadWorksList();
  } catch (error) {
    showMessage(error.message, "is-error");
  }
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
  loadWorksList();
}

init();
