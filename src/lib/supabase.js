// ── lib/supabase.js ──────────────────────────────────────────
// Client Supabase léger sans SDK (fetch direct sur l'API REST)
// Variables d'env injectées par Vite au build

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("⚠️  Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes !");
}

const headers = () => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
});

const api = async (path, options = {}) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      ...options,
      headers: { ...headers(), ...options.headers },
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase error:", res.status, err);
      return null;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("Fetch error:", e);
    return null;
  }
};

// ── MEMES ──────────────────────────────────────────────────
export const getMemes = () =>
  api("/memes?select=*&order=created_at.desc");

export const insertMeme = (meme) =>
  api("/memes", {
    method: "POST",
    body: JSON.stringify({
      id: meme.id,
      title: meme.title,
      image_url: meme.imageUrl,
      texts: meme.texts,
      author: meme.author,
      tags: meme.tags,
      likes: meme.likes,
      dislikes: meme.dislikes,
    }),
  });

export const updateMemeLikes = (id, likes, dislikes) =>
  api(`/memes?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ likes, dislikes }),
  });

export const deleteMeme = (id) =>
  api(`/memes?id=eq.${id}`, { method: "DELETE" });

// ── USERS ──────────────────────────────────────────────────
export const getUsers = () => api("/users?select=username,created_at");

export const getUserByName = (username) =>
  api(`/users?username=eq.${encodeURIComponent(username)}&select=username,password,created_at`);

export const insertUser = (username, password) =>
  api("/users", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

// ── VOTES ──────────────────────────────────────────────────
export const getVotesByUser = (userId) =>
  api(`/votes?user_id=eq.${encodeURIComponent(userId)}`);

export const upsertVote = (userId, memeId, direction) =>
  api("/votes", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, meme_id: memeId, direction }),
  });

export const deleteVote = (userId, memeId) =>
  api(`/votes?user_id=eq.${encodeURIComponent(userId)}&meme_id=eq.${memeId}`, {
    method: "DELETE",
  });

// ── COMMENTS ───────────────────────────────────────────────
export const getComments = () =>
  api("/comments?select=*&order=created_at.asc");

export const insertComment = (c) =>
  api("/comments", {
    method: "POST",
    body: JSON.stringify({
      id: c.id,
      meme_id: c.memeId,
      author: c.author,
      text: c.text,
      likes: 0,
      parent_id: c.parentId || null,
    }),
  });

export const updateCommentLikes = (id, likes) =>
  api(`/comments?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ likes }),
  });

// ── COMMENT VOTES ──────────────────────────────────────────
export const getCommentVotesByUser = (userId) =>
  api(`/comment_votes?user_id=eq.${encodeURIComponent(userId)}`);

export const insertCommentVote = (userId, commentId) =>
  api("/comment_votes", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, comment_id: commentId }),
  });

export const deleteCommentVote = (userId, commentId) =>
  api(`/comment_votes?user_id=eq.${encodeURIComponent(userId)}&comment_id=eq.${commentId}`, {
    method: "DELETE",
  });

// ── FOLLOWS ────────────────────────────────────────────────
export const getFollowsByUser = (follower) =>
  api(`/follows?follower=eq.${encodeURIComponent(follower)}`);

export const insertFollow = (follower, followed) =>
  api("/follows", {
    method: "POST",
    body: JSON.stringify({ follower, followed }),
  });

export const deleteFollow = (follower, followed) =>
  api(`/follows?follower=eq.${encodeURIComponent(follower)}&followed=eq.${encodeURIComponent(followed)}`, {
    method: "DELETE",
  });

// ── FAVORITES ──────────────────────────────────────────────
export const getFavorites = (userId) =>
  api(`/favorites?user_id=eq.${encodeURIComponent(userId)}`);

export const insertFavorite = (userId, memeId) =>
  api("/favorites", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, meme_id: memeId }),
  });

export const deleteFavorite = (userId, memeId) =>
  api(`/favorites?user_id=eq.${encodeURIComponent(userId)}&meme_id=eq.${memeId}`, {
    method: "DELETE",
  });

// ── ADMIN ───────────────────────────────────────────────────
export const deleteComment = (id) =>
  api(`/comments?id=eq.${id}`, { method: "DELETE" });

export const updateComment = (id, text) =>
  api(`/comments?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });

export const deleteUser = (username) =>
  api(`/users?username=eq.${encodeURIComponent(username)}`, { method: "DELETE" });

export const getAllUsers = () =>
  api("/users?select=username,is_admin,created_at&order=created_at.desc");
