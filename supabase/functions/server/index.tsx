import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// --- Logger ---
app.use('*', logger(console.log));

// --- CORS ---
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

// --- Supabase setup ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("=== Server Starting ===");
console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("SUPABASE_ANON_KEY present:", !!SUPABASE_ANON_KEY);
console.log("SERVICE_ROLE_KEY present:", !!SUPABASE_SERVICE_ROLE_KEY);
console.log("======================");

// --- Helper: Verify JWT token and get user ---
async function getUserFromToken(authHeader: string | undefined) {
  if (!authHeader) {
    console.log('[Auth] No Authorization header');
    return { user: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('[Auth] Token present:', !!token);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.log('[Auth] Error:', error.message);
      return { user: null, error: error.message };
    }

    console.log('[Auth] User verified:', user?.id);
    return { user, error: null };
  } catch (err) {
    console.log('[Auth] Exception:', err);
    return { user: null, error: 'Token verification failed' };
  }
}

// --- OPTIONS handler ---
app.options("*", (c) => {
  return c.text("", 204);
});

// --- Health check (NO AUTH REQUIRED) ---
app.get("/health", (c) => {
  console.log('[Health] Check called');
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Sign up ---
app.post("/signup", async (c) => {
  try {
    const { email, password, name, companyName } = await c.req.json();
    
    console.log('[Signup] Request for:', email);

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, companyName },
      email_confirm: true
    });

    if (error) {
      console.log('[Signup] Error:', error.message);
      return c.json({ error: error.message }, 400);
    }

    // Store profile
    await kv.set(`user:${data.user.id}`, {
      userId: data.user.id,
      email: data.user.email,
      name: name || '',
      companyName: companyName || '',
      address: '',
      phone: '',
      kvkNumber: '',
      vatNumber: '',
      createdAt: new Date().toISOString()
    });

    console.log('[Signup] Success for user:', data.user.id);
    return c.json({ user: data.user });
  } catch (error) {
    console.log('[Signup] Exception:', error);
    return c.json({ error: "Failed to sign up" }, 500);
  }
});

// --- Get profile ---
app.get("/profile", async (c) => {
  console.log('[Profile GET] Request received');
  
  const { user, error } = await getUserFromToken(c.req.header('Authorization'));
  
  if (error || !user) {
    console.log('[Profile GET] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await kv.get(`user:${user.id}`);
  
  if (!profile) {
    console.log('[Profile GET] Profile not found for:', user.id);
    return c.json({ error: "Profile not found" }, 404);
  }

  console.log('[Profile GET] Success for user:', user.id);
  return c.json({ profile });
});

// --- Update profile ---
app.put("/profile", async (c) => {
  console.log('[Profile PUT] Request received');
  
  const { user, error } = await getUserFromToken(c.req.header('Authorization'));
  
  if (error || !user) {
    console.log('[Profile PUT] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const updates = await c.req.json();
  const currentProfile = await kv.get(`user:${user.id}`);
  
  const updatedProfile = {
    ...currentProfile,
    ...updates,
    userId: user.id,
    updatedAt: new Date().toISOString()
  };

  await kv.set(`user:${user.id}`, updatedProfile);
  
  console.log('[Profile PUT] Success for user:', user.id);
  return c.json({ profile: updatedProfile });
});

// --- Create quotation ---
app.post("/quotations", async (c) => {
  console.log('[Quotations POST] Request received');
  
  const { user, error } = await getUserFromToken(c.req.header('Authorization'));
  
  if (error || !user) {
    console.log('[Quotations POST] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const data = await c.req.json();
    
    const timestamp = Date.now();
    const quotationNumber = `OFF-${timestamp}`;

    const quotation = {
      id: `${timestamp}`,
      quotationNumber,
      userId: user.id,
      clientName: data.clientName,
      clientAddress: data.clientAddress,
      description: data.description,
      price: data.price,
      vatPercentage: data.vatPercentage,
      status: data.status || "draft",
      date: data.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`quotation:${user.id}:${quotation.id}`, quotation);

    console.log('[Quotations POST] Success for user:', user.id);
    return c.json({ quotation });
  } catch (err) {
    console.log('[Quotations POST] Error:', err);
    return c.json({ error: "Failed to create quotation" }, 500);
  }
});

// --- Get all quotations ---
app.get("/quotations", async (c) => {
  console.log('[Quotations GET] Request received');
  
  const { user, error } = await getUserFromToken(c.req.header('Authorization'));
  
  if (error || !user) {
    console.log('[Quotations GET] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const quotations = await kv.getByPrefix(`quotation:${user.id}:`);
  
  console.log('[Quotations GET] Success, found:', quotations?.length || 0);
  return c.json({ quotations: quotations || [] });
});

// --- Get single quotation ---
app.get("/quotations/:id", async (c) => {
  console.log('[Quotations GET/:id] Request received');
  
  const { user, error } = await getUserFromToken(c.req.header('Authorization'));
  
  if (error || !user) {
    console.log('[Quotations GET/:id] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const quotation = await kv.get(`quotation:${user.id}:${id}`);
  
  if (!quotation) {
    console.log('[Quotations GET/:id] Not found:', id);
    return c.json({ error: "Quotation not found" }, 404);
  }

  console.log('[Quotations GET/:id] Success for:', id);
  return c.json({ quotation });
});

// --- Update quotation ---
app.put("/quotations/:id", async (c) => {
  console.log('[Quotations PUT/:id] Request received');
  
  const { user, error } = await getUserFromToken(c.req.header('Authorization'));
  
  if (error || !user) {
    console.log('[Quotations PUT/:id] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const id = c.req.param("id");
    const currentQuotation = await kv.get(`quotation:${user.id}:${id}`);
    
    if (!currentQuotation) {
      console.log('[Quotations PUT/:id] Not found:', id);
      return c.json({ error: "Quotation not found" }, 404);
    }

    const updates = await c.req.json();
    const updatedQuotation = {
      ...currentQuotation,
      ...updates,
      userId: user.id,
      id: currentQuotation.id,
      quotationNumber: currentQuotation.quotationNumber,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`quotation:${user.id}:${id}`, updatedQuotation);

    console.log('[Quotations PUT/:id] Success for:', id);
    return c.json({ quotation: updatedQuotation });
  } catch (err) {
    console.log('[Quotations PUT/:id] Error:', err);
    return c.json({ error: "Failed to update quotation" }, 500);
  }
});

// --- Delete quotation ---
app.delete("/quotations/:id", async (c) => {
  console.log('[Quotations DELETE/:id] Request received');
  
  const { user, error } = await getUserFromToken(c.req.header('Authorization'));
  
  if (error || !user) {
    console.log('[Quotations DELETE/:id] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  await kv.del(`quotation:${user.id}:${id}`);

  console.log('[Quotations DELETE/:id] Success for:', id);
  return c.json({ success: true });
});

// --- Start server ---
Deno.serve(app.fetch);