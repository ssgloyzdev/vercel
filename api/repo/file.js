const { requireAdmin } = require("../../lib/auth.js");
const { getFile, upsertFile, deleteFile } = require("../../lib/github.js");

module.exports = async (req, res) => {
  try {
    await requireAdmin(req);

    if (req.method === "GET") {
      const path = req.query.path;
      if (!path) {
        res.status(400).json({ error: "path wajib diisi" });
        return;
      }

      const file = await getFile(path);
      const content = Buffer.from(file.content, "base64").toString("utf-8");

      res.status(200).json({ path, content, sha: file.sha });
      return;
    }

    if (req.method === "PUT") {
      const { path, content, message, sha } = req.body;

      if (!path || content === undefined) {
        res.status(400).json({ error: "path dan content wajib diisi" });
        return;
      }

      const contentBase64 = Buffer.from(content, "utf-8").toString("base64");
      const result = await upsertFile(path, contentBase64, message || `update ${path}`, sha);

      res.status(200).json({ path, sha: result.content.sha });
      return;
    }

    if (req.method === "DELETE") {
      const { path, sha, message } = req.body;

      if (!path || !sha) {
        res.status(400).json({ error: "path dan sha wajib diisi" });
        return;
      }

      await deleteFile(path, sha, message || `delete ${path}`);
      res.status(200).json({ path, deleted: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};
