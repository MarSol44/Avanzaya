import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Health check endpoint
app.get("/make-server-06f58416/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth endpoints
app.post("/make-server-06f58416/auth/signup", async (c) => {
  try {
    const { name, email, password } = await c.req.json();

    if (!name || !email || !password) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true, // Auto-confirm email since email server isn't configured
    });

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Initialize user data in KV store
    const userId = data.user.id;
    await kv.set(`user:${userId}:profile`, {
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    return c.json({ user: data.user }, 201);
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get current user profile
app.get("/make-server-06f58416/auth/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "No access token provided" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while getting user profile: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`user:${user.id}:profile`);
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || 'Usuario',
        photo: profile?.photo,
      }
    });
  } catch (error) {
    console.log(`Server error while getting user profile: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update user profile
app.put("/make-server-06f58416/auth/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "No access token provided" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while updating user profile: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, photo } = await c.req.json();
    const currentProfile = await kv.get(`user:${user.id}:profile`) || {};

    await kv.set(`user:${user.id}:profile`, {
      ...currentProfile,
      name: name || currentProfile.name,
      photo: photo || currentProfile.photo,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.log(`Server error while updating user profile: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// User data endpoints
app.get("/make-server-06f58416/data/:dataType", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "No access token provided" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while getting user data: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const dataType = c.req.param('dataType');
    const data = await kv.get(`user:${user.id}:${dataType}`);

    return c.json({ data: data || null });
  } catch (error) {
    console.log(`Server error while getting user data: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-06f58416/data/:dataType", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "No access token provided" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Authorization error while saving user data: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const dataType = c.req.param('dataType');
    const body = await c.req.json();

    await kv.set(`user:${user.id}:${dataType}`, body.data);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Server error while saving user data: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);