import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function pageUrl(file) {
  return new URL(file, window.location.href).href;
}

export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: pageUrl("./login.html")
    }
  });

  if (error) throw error;
  return data;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

async function loginWithProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: pageUrl("./login.html")
    }
  });

  if (error) throw error;
  return data;
}

export function loginWithGoogle() {
  return loginWithProvider("google");
}

export function loginWithGitHub() {
  return loginWithProvider("github");
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

export async function getSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

export async function getUserRole(email) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("email", email)
    .single();

  if (error) return "user";
  return data.role;
}

export function maskEmail(email) {
  if (!email) return "";

  const [local, domain] = email.split("@");
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);

  return `${visible}***@${domain}`;
}

export function resolveAvatarUrl(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  return metadata.custom_avatar_url || metadata.avatar_url || null;
}

export async function updateCustomAvatar(url) {
  const { data, error } = await supabase.auth.updateUser({
    data: { custom_avatar_url: url || null }
  });

  if (error) throw error;
  return data.user;
}
