const { requireAdmin } = require("../../lib/auth.js");
const {
  getTree,
  upsertFile,
  getRef,
  getCommit,
  createTree,
  createCommit,
  updateRef
} = require("../../lib/github.js");

module.exports = async (req, res) => {
  try {
    await requireAdmin(req);

    if (req.method === "POST") {
      const { path } = req.body;

      if (!path) {
        res.status(400).json({ error: "path wajib diisi" });
        return;
      }

      const keepPath = `${path.replace(/\/$/, "")}/.gitkeep`;
      const contentBase64 = Buffer.from("").toString("base64");

      await upsertFile(keepPath, contentBase64, `create folder ${path}`);
      res.status(200).json({ path, created: true });
      return;
    }

    if (req.method === "DELETE") {
      const { path, message } = req.body;

      if (!path) {
        res.status(400).json({ error: "path wajib diisi" });
        return;
      }

      const prefix = `${path.replace(/\/$/, "")}/`;
      const tree = await getTree();

      const targets = tree.tree.filter(
        (item) => item.type === "blob" && item.path.startsWith(prefix)
      );

      if (targets.length === 0) {
        res.status(404).json({ error: "Folder tidak ditemukan atau sudah kosong" });
        return;
      }

      const ref = await getRef();
      const latestCommitSha = ref.object.sha;
      const latestCommit = await getCommit(latestCommitSha);

      const entries = targets.map((item) => ({
        path: item.path,
        mode: item.mode,
        type: item.type,
        sha: null
      }));

      const newTree = await createTree(latestCommit.tree.sha, entries);
      const newCommit = await createCommit(
        message || `delete folder ${path}`,
        newTree.sha,
        latestCommitSha
      );

      await updateRef(newCommit.sha);

      res.status(200).json({ path, deleted: true, filesRemoved: targets.length });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};
