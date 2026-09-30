import { supabase } from "./auth.js";

export async function fetchComments() {
  const { data, error } = await supabase
    .from("comments")
    .select("id, email, content, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function addComment(content) {
  const { data, error } = await supabase
    .from("comments")
    .insert({ content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToComments(onInsert) {
  return supabase
    .channel("comments-feed")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comments" },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
}
