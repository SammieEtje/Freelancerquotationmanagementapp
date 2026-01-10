import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono().basePath('/server');

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

// =====================
// INVOICE ENDPOINTS
// =====================

// --- Create invoice ---
app.post("/invoices", async (c) => {
  console.log('[Invoices POST] Request received');

  const { user, error } = await getUserFromToken(c.req.header('Authorization'));

  if (error || !user) {
    console.log('[Invoices POST] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const data = await c.req.json();

    // Get next invoice number
    const existingInvoices = await kv.getByPrefix(`invoice:${user.id}:`);
    const nextNumber = (existingInvoices?.length || 0) + 1;
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

    const timestamp = Date.now();
    const invoice = {
      id: `${timestamp}`,
      invoiceNumber,
      userId: user.id,
      clientName: data.clientName,
      clientAddress: data.clientAddress,
      description: data.description,
      price: data.price,
      vatPercentage: data.vatPercentage,
      lineItems: data.lineItems || [],
      status: data.status || "draft",
      date: data.date || new Date().toISOString(),
      dueDate: data.dueDate || null,
      paidDate: data.paidDate || null,
      quotationId: data.quotationId || null,
      quotationNumber: data.quotationNumber || null,
      paymentTermDays: data.paymentTermDays || 30,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`invoice:${user.id}:${invoice.id}`, invoice);

    console.log('[Invoices POST] Success for user:', user.id);
    return c.json({ invoice });
  } catch (err) {
    console.log('[Invoices POST] Error:', err);
    return c.json({ error: "Failed to create invoice" }, 500);
  }
});

// --- Get all invoices ---
app.get("/invoices", async (c) => {
  console.log('[Invoices GET] Request received');

  const { user, error } = await getUserFromToken(c.req.header('Authorization'));

  if (error || !user) {
    console.log('[Invoices GET] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const invoices = await kv.getByPrefix(`invoice:${user.id}:`);

  console.log('[Invoices GET] Success, found:', invoices?.length || 0);
  return c.json({ invoices: invoices || [] });
});

// --- Get single invoice ---
app.get("/invoices/:id", async (c) => {
  console.log('[Invoices GET/:id] Request received');

  const { user, error } = await getUserFromToken(c.req.header('Authorization'));

  if (error || !user) {
    console.log('[Invoices GET/:id] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const invoice = await kv.get(`invoice:${user.id}:${id}`);

  if (!invoice) {
    console.log('[Invoices GET/:id] Not found:', id);
    return c.json({ error: "Invoice not found" }, 404);
  }

  console.log('[Invoices GET/:id] Success for:', id);
  return c.json({ invoice });
});

// --- Update invoice ---
app.put("/invoices/:id", async (c) => {
  console.log('[Invoices PUT/:id] Request received');

  const { user, error } = await getUserFromToken(c.req.header('Authorization'));

  if (error || !user) {
    console.log('[Invoices PUT/:id] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const id = c.req.param("id");
    const currentInvoice = await kv.get(`invoice:${user.id}:${id}`);

    if (!currentInvoice) {
      console.log('[Invoices PUT/:id] Not found:', id);
      return c.json({ error: "Invoice not found" }, 404);
    }

    const updates = await c.req.json();
    const updatedInvoice = {
      ...currentInvoice,
      ...updates,
      userId: user.id,
      id: currentInvoice.id,
      invoiceNumber: currentInvoice.invoiceNumber,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`invoice:${user.id}:${id}`, updatedInvoice);

    console.log('[Invoices PUT/:id] Success for:', id);
    return c.json({ invoice: updatedInvoice });
  } catch (err) {
    console.log('[Invoices PUT/:id] Error:', err);
    return c.json({ error: "Failed to update invoice" }, 500);
  }
});

// --- Delete invoice ---
app.delete("/invoices/:id", async (c) => {
  console.log('[Invoices DELETE/:id] Request received');

  const { user, error } = await getUserFromToken(c.req.header('Authorization'));

  if (error || !user) {
    console.log('[Invoices DELETE/:id] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  await kv.del(`invoice:${user.id}:${id}`);

  console.log('[Invoices DELETE/:id] Success for:', id);
  return c.json({ success: true });
});

// --- Convert quotation to invoice ---
app.post("/quotations/:id/convert-to-invoice", async (c) => {
  console.log('[Convert to Invoice] Request received');

  const { user, error } = await getUserFromToken(c.req.header('Authorization'));

  if (error || !user) {
    console.log('[Convert to Invoice] Auth failed:', error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const quotationId = c.req.param("id");
    const quotation = await kv.get(`quotation:${user.id}:${quotationId}`);

    if (!quotation) {
      console.log('[Convert to Invoice] Quotation not found:', quotationId);
      return c.json({ error: "Quotation not found" }, 404);
    }

    // Get next invoice number
    const existingInvoices = await kv.getByPrefix(`invoice:${user.id}:`);
    const nextNumber = (existingInvoices?.length || 0) + 1;
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

    const timestamp = Date.now();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = {
      id: `${timestamp}`,
      invoiceNumber,
      userId: user.id,
      clientName: quotation.clientName,
      clientAddress: quotation.clientAddress,
      description: quotation.description,
      price: quotation.price,
      vatPercentage: quotation.vatPercentage,
      lineItems: quotation.lineItems || [],
      status: "sent",
      date: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      paidDate: null,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      paymentTermDays: 30,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`invoice:${user.id}:${invoice.id}`, invoice);

    // Update quotation status to accepted if not already
    if (quotation.status !== 'accepted') {
      await kv.set(`quotation:${user.id}:${quotationId}`, {
        ...quotation,
        status: 'accepted',
        invoiceId: invoice.id,
        updatedAt: new Date().toISOString()
      });
    }

    console.log('[Convert to Invoice] Success, created invoice:', invoice.invoiceNumber);
    return c.json({ invoice });
  } catch (err) {
    console.log('[Convert to Invoice] Error:', err);
    return c.json({ error: "Failed to convert quotation to invoice" }, 500);
  }
});

// --- Start server ---
Deno.serve(app.fetch);