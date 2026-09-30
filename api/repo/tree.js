const { requireAdmin } = require("../../lib/auth.js");
const { getTree } = require("../../lib/github.js");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await requireAdmin(req);
    const tree = await getTree();

    const files = tree.tree
      .filter((item) => item.type === "blob")
      .map((item) => ({ path: item.path, sha: item.sha, size: item.size }))
      .sort((a, b) => a.path.localeCompare(b.path));

    res.status(200).json({ files });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};
