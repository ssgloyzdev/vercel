const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  const lines = fs.readFileSync(filePath, "utf8").split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }

  return env;
}

const localEnv = loadEnvFile(path.join(__dirname, "..", ".env"));

const SUPABASE_URL = process.env.SUPABASE_URL || localEnv.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("SUPABASE_URL dan SUPABASE_ANON_KEY belum diset");
  process.exit(1);
}

const templatePath = path.join(__dirname, "..", "js", "config.template.js");
const outputPath = path.join(__dirname, "..", "js", "config.js");

const content = fs
  .readFileSync(templatePath, "utf8")
  .replace("__SUPABASE_URL__", SUPABASE_URL)
  .replace("__SUPABASE_ANON_KEY__", SUPABASE_ANON_KEY);

fs.writeFileSync(outputPath, content);
console.log("config.js berhasil dibuat");
