const GITHUB_API = "https://api.github.com";

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function repoBase() {
  return `${GITHUB_API}/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`;
}

function branch() {
  return process.env.GITHUB_BRANCH || "main";
}

function encodeGitPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest(path, options) {
  const opts = options || {};

  const res = await fetch(`${repoBase()}${path}`, {
    ...opts,
    headers: { ...githubHeaders(), "Content-Type": "application/json", ...(opts.headers || {}) }
  });

  if (!res.ok) {
    const body = await res.text();
    const error = new Error(`GitHub API error ${res.status}: ${body}`);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

async function getTree() {
  return githubRequest(`/git/trees/${branch()}?recursive=1`);
}

async function getFile(path) {
  return githubRequest(`/contents/${encodeGitPath(path)}?ref=${branch()}`);
}

async function upsertFile(path, contentBase64, message, sha) {
  return githubRequest(`/contents/${encodeGitPath(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch: branch(),
      ...(sha ? { sha } : {})
    })
  });
}

async function deleteFile(path, sha, message) {
  return githubRequest(`/contents/${encodeGitPath(path)}`, {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: branch() })
  });
}

async function getRef() {
  return githubRequest(`/git/ref/heads/${branch()}`);
}

async function getCommit(commitSha) {
  return githubRequest(`/git/commits/${commitSha}`);
}

async function createTree(baseTreeSha, entries) {
  return githubRequest(`/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: entries })
  });
}

async function createCommit(message, treeSha, parentSha) {
  return githubRequest(`/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] })
  });
}

async function updateRef(commitSha) {
  return githubRequest(`/git/refs/heads/${branch()}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSha })
  });
}

module.exports = {
  getTree,
  getFile,
  upsertFile,
  deleteFile,
  getRef,
  getCommit,
  createTree,
  createCommit,
  updateRef
};
