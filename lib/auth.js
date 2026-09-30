function throwHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

async function requireAdmin(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) throwHttpError(401, "Unauthorized");

  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.SUPABASE_ANON_KEY
    }
  });

  if (!userRes.ok) throwHttpError(401, "Unauthorized");

  const user = await userRes.json();

  const roleRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/user_roles?email=eq.${encodeURIComponent(user.email)}&select=role`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_ANON_KEY
      }
    }
  );

  if (!roleRes.ok) throwHttpError(403, "Forbidden");

  const roleRows = await roleRes.json();
  const role = roleRows[0] ? roleRows[0].role : null;

  if (role !== "admin") throwHttpError(403, "Forbidden");

  return user;
}

module.exports = { requireAdmin };
