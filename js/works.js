import { supabase } from "./auth.js";

export async function fetchWorks() {
  const { data, error } = await supabase
    .from("works")
    .select("id, title, description, path, display_mode, iframe_width, iframe_height, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function addWork(title, path, description, displayMode, iframeWidth, iframeHeight) {
  const { data, error } = await supabase
    .from("works")
    .insert({
      title,
      path,
      description: description || null,
      display_mode: displayMode === "banner" ? "banner" : "click",
      iframe_width: iframeWidth || null,
      iframe_height: iframeHeight || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWork(id) {
  const { error } = await supabase.from("works").delete().eq("id", id);
  if (error) throw error;
}
