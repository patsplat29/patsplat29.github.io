// functions/api/posts.js
//
// Cloudflare Pages Function — handles the blog posts API.
// Requires a KV namespace bound as "BLOG_KV" (see README-CLOUDFLARE-SETUP.md)
// Requires an environment variable "OWNER_PASSPHRASE" set in Pages settings.
//
// Routes (all under /api/posts):
//   GET    /api/posts          -> returns array of all posts (public, no auth needed)
//   POST   /api/posts          -> create a new post (requires passphrase)
//   PUT    /api/posts          -> edit an existing post (requires passphrase)
//   DELETE /api/posts          -> delete a post by id (requires passphrase)
//
// Auth: the passphrase is sent in the request body as "passphrase" and checked
// server-side against the OWNER_PASSPHRASE environment variable/secret. It is
// NEVER exposed in any client-side code, unlike the old in-artifact version.

const POSTS_KEY = "patsplat-blog-posts";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function getPosts(env) {
  const raw = await env.BLOG_KV.get(POSTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function savePosts(env, posts) {
  await env.BLOG_KV.put(POSTS_KEY, JSON.stringify(posts));
}

function checkAuth(env, passphrase) {
  if (!env.OWNER_PASSPHRASE) return false;
  return passphrase === env.OWNER_PASSPHRASE;
}

export async function onRequestGet({ env }) {
  try {
    const posts = await getPosts(env);
    return jsonResponse({ posts });
  } catch (err) {
    return jsonResponse({ error: "Failed to load posts" }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { passphrase, title, category, tags, postBody } = body;

    if (!checkAuth(env, passphrase)) {
      return jsonResponse({ error: "Invalid passphrase" }, 401);
    }
    if (!title || !postBody) {
      return jsonResponse({ error: "Title and body are required" }, 400);
    }

    const posts = await getPosts(env);
    const newPost = {
      id: "post_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      title: String(title).slice(0, 200),
      category: category ? String(category).slice(0, 60) : "",
      tags: Array.isArray(tags) ? tags.slice(0, 10).map(t => String(t).slice(0, 30)) : [],
      body: String(postBody).slice(0, 20000),
      createdAt: Date.now(),
    };
    posts.push(newPost);
    await savePosts(env, posts);

    return jsonResponse({ post: newPost });
  } catch (err) {
    return jsonResponse({ error: "Failed to create post" }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const body = await request.json();
    const { passphrase, id, title, category, tags, postBody } = body;

    if (!checkAuth(env, passphrase)) {
      return jsonResponse({ error: "Invalid passphrase" }, 401);
    }
    if (!id || !title || !postBody) {
      return jsonResponse({ error: "id, title, and body are required" }, 400);
    }

    const posts = await getPosts(env);
    const post = posts.find(p => p.id === id);
    if (!post) {
      return jsonResponse({ error: "Post not found" }, 404);
    }

    post.title = String(title).slice(0, 200);
    post.category = category ? String(category).slice(0, 60) : "";
    post.tags = Array.isArray(tags) ? tags.slice(0, 10).map(t => String(t).slice(0, 30)) : [];
    post.body = String(postBody).slice(0, 20000);

    await savePosts(env, posts);
    return jsonResponse({ post });
  } catch (err) {
    return jsonResponse({ error: "Failed to update post" }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const body = await request.json();
    const { passphrase, id } = body;

    if (!checkAuth(env, passphrase)) {
      return jsonResponse({ error: "Invalid passphrase" }, 401);
    }
    if (!id) {
      return jsonResponse({ error: "id is required" }, 400);
    }

    let posts = await getPosts(env);
    posts = posts.filter(p => p.id !== id);
    await savePosts(env, posts);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: "Failed to delete post" }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
