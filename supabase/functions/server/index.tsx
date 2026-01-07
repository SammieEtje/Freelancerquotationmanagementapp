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
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// --- Supabase setup ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

console.log("=== Server Starting ===");
console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY present:", !!SUPABASE_SERVICE_ROLE_KEY);
console.log("======================");

// --- Explicit OPTIONS handler (required for browser preflight) ---
app.options("*", (c) => {
  return c.text("", 204);
});

// --- Health check ---
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});


// --- Create quotation ---
app.post("/quotations", async (c) => {
  try {
    const data = await c.req.json();

    if (!data.userId) {
      return c.json({ error: "userId ontbreekt" }, 400);
    }

    const quotation = {
      id: crypto.randomUUID(),
      userId: data.userId,
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

    await kv.set(`quotation:${data.userId}:${quotation.id}`, quotation);

    return c.json({ quotation });
  } catch (err) {
    console.log("Create quotation error:", err);
    return c.json({ error: "Failed to create quotation" }, 500);
  }
});

// --- Get all quotations for user ---
app.get("/quotations", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "userId ontbreekt" }, 400);
  }

  const quotations = await kv.getByPrefix(`quotation:${userId}:`);
  return c.json({ quotations: quotations || [] });
});

// --- Get single quotation ---
app.get("/quotations/:id", async (c) => {
  const userId = c.req.query("userId");
  const id = c.req.param("id");

  if (!userId) {
    return c.json({ error: "userId ontbreekt" }, 400);
  }

  const quotation = await kv.get(`quotation:${userId}:${id}`);
  if (!quotation) {
    return c.json({ error: "Quotation not found" }, 404);
  }

  return c.json({ quotation });
});

// --- Update quotation ---
app.put("/quotations/:id", async (c) => {
  try {
    const userId = c.req.query("userId");
    const id = c.req.param("id");

    if (!userId) {
      return c.json({ error: "userId ontbreekt" }, 400);
    }

    const currentQuotation = await kv.get(`quotation:${userId}:${id}`);
    if (!currentQuotation) {
      return c.json({ error: "Quotation not found" }, 404);
    }

    const updates = await c.req.json();
    const updatedQuotation = {
      ...currentQuotation,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`quotation:${userId}:${id}`, updatedQuotation);

    return c.json({ quotation: updatedQuotation });
  } catch (err) {
    console.log("Update quotation error:", err);
    return c.json({ error: "Failed to update quotation" }, 500);
  }
});

// --- Delete quotation ---
app.delete("/quotations/:id", async (c) => {
  const userId = c.req.query("userId");
  const id = c.req.param("id");

  if (!userId) {
    return c.json({ error: "userId ontbreekt" }, 400);
  }

  await kv.del(`quotation:${userId}:${id}`);
  return c.json({ success: true });
});

// --- Start server ---
Deno.serve(app.fetch);


// import { Hono } from "npm:hono";
// import { cors } from "npm:hono/cors";
// import { logger } from "npm:hono/logger";
// import { createClient } from "npm:@supabase/supabase-js@2";
// import * as kv from "./kv_store.tsx";

// const app = new Hono();

// // Enable logger
// app.use('*', logger(console.log));

// // Log environment check on startup
// console.log('=== Server Starting ===');
// console.log('SUPABASE_URL present:', !!Deno.env.get('SUPABASE_URL'));
// console.log('SUPABASE_ANON_KEY present:', !!Deno.env.get('SUPABASE_ANON_KEY'));
// console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// console.log('SUPABASE_URL value:', Deno.env.get('SUPABASE_URL'));
// console.log('======================');

// // Enable CORS for all routes and methods
// app.use(
//   "/*",
//   cors({
//     origin: "*",
//     allowHeaders: ["Content-Type", "Authorization"],
//     allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     exposeHeaders: ["Content-Length"],
//     maxAge: 600,
//   }),
// );

// // Get environment variables with fallbacks
// const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://xnxespizqorrfxtvukkz.supabase.co';
// const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhueGVzcGl6cW9ycmZ4dHZ1a2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODU2OTcsImV4cCI6MjA4Mjk2MTY5N30.lWFiXp2Bk7P6HnbzDCYZZ3b6QQ96QrJO3YAnC8P_wVU';
// const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhueGVzcGl6cW9ycmZ4dHZ1a2t6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjk1MzEyMywiZXhwIjoyMDUyNTI5MTIzfQ.FNPBDQPPuTTCVjbS5VGn6vGYBVaRWl3nCIHxJ_vDU2s';

// console.log('Using SUPABASE_URL:', SUPABASE_URL);
// console.log('SUPABASE_ANON_KEY configured:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
// console.log('SERVICE_ROLE_KEY configured:', !!SUPABASE_SERVICE_ROLE_KEY);

// // Helper function to verify user with access token
// async function verifyUser(accessToken: string) {
//   console.log('[verifyUser] Starting verification...');
//   console.log('[verifyUser] Token preview:', accessToken?.substring(0, 30) + '...');
  
//   // Try multiple verification methods
  
//   // Method 1: Using anon client
//   try {
//     console.log('[verifyUser] Method 1: Trying with anon client...');
//     const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
//     if (user && !error) {
//       console.log('[verifyUser] Method 1 SUCCESS - User:', user.id);
//       return { user, error: null };
//     }
    
//     console.log('[verifyUser] Method 1 FAILED:', error?.message);
//   } catch (e) {
//     console.log('[verifyUser] Method 1 EXCEPTION:', e);
//   }
  
//   // Method 2: Using admin client  
//   try {
//     console.log('[verifyUser] Method 2: Trying with admin client...');
//     const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
//     if (user && !error) {
//       console.log('[verifyUser] Method 2 SUCCESS - User:', user.id);
//       return { user, error: null };
//     }
    
//     console.log('[verifyUser] Method 2 FAILED:', error?.message);
//   } catch (e) {
//     console.log('[verifyUser] Method 2 EXCEPTION:', e);
//   }
  
//   // Method 3: Direct API call to Supabase auth
//   try {
//     console.log('[verifyUser] Method 3: Trying direct API call...');
//     const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
//       headers: {
//         'Authorization': `Bearer ${accessToken}`,
//         'apikey': SUPABASE_ANON_KEY,
//       },
//     });
    
//     console.log('[verifyUser] Method 3 Response status:', response.status);
    
//     if (response.ok) {
//       const user = await response.json();
//       console.log('[verifyUser] Method 3 SUCCESS - User:', user.id);
//       return { user, error: null };
//     }
    
//     const errorData = await response.json();
//     console.log('[verifyUser] Method 3 FAILED:', errorData);
//   } catch (e) {
//     console.log('[verifyUser] Method 3 EXCEPTION:', e);
//   }
  
//   console.log('[verifyUser] ALL METHODS FAILED');
//   return { user: null, error: { message: 'Token verification failed with all methods' } };
// }

// // Create Supabase admin client (for admin operations like user creation)
// const supabaseAdmin = createClient(
//   SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY,
// );

// // Create Supabase anon client (for JWT verification)
// const supabase = createClient(
//   SUPABASE_URL,
//   SUPABASE_ANON_KEY,
// );

// // Health check endpoint
// app.get("/make-server-82bafaab/health", (c) => {
//   console.log('Health check endpoint called');
//   return c.json({ status: "ok", timestamp: new Date().toISOString() });
// });

// // Test endpoint to check quotations route
// app.get("/make-server-82bafaab/test", (c) => {
//   console.log('Test endpoint called');
//   return c.json({ 
//     message: "Server is running!", 
//     routes: [
//       "POST /make-server-82bafaab/quotations",
//       "GET /make-server-82bafaab/quotations",
//       "GET /make-server-82bafaab/quotations/:id",
//       "PUT /make-server-82bafaab/quotations/:id",
//       "DELETE /make-server-82bafaab/quotations/:id"
//     ]
//   });
// });

// // Sign up endpoint
// app.post("/make-server-82bafaab/signup", async (c) => {
//   try {
//     const { email, password, name, companyName } = await c.req.json();
    
//     if (!email || !password) {
//       return c.json({ error: "Email and password are required" }, 400);
//     }

//     // Create user with auto-confirmed email
//     const { data, error } = await supabaseAdmin.auth.admin.createUser({
//       email,
//       password,
//       user_metadata: { name, companyName },
//       // Automatically confirm the user's email since an email server hasn't been configured.
//       email_confirm: true
//     });

//     if (error) {
//       console.log(`Sign up error: ${error.message}`);
//       return c.json({ error: error.message }, 400);
//     }

//     // Store user profile in KV store
//     await kv.set(`user:${data.user.id}`, {
//       userId: data.user.id,
//       email: data.user.email,
//       name: name || '',
//       companyName: companyName || '',
//       address: '',
//       phone: '',
//       kvkNumber: '',
//       vatNumber: '',
//       createdAt: new Date().toISOString()
//     });

//     return c.json({ user: data.user });
//   } catch (error) {
//     console.log(`Sign up error: ${error}`);
//     return c.json({ error: "Failed to sign up" }, 500);
//   }
// });

// // Get user profile
// app.get("/make-server-82bafaab/profile", async (c) => {
//   try {
//     const accessToken = c.req.header('Authorization')?.split(' ')[1];
//     console.log('GET /profile - Request received');
//     console.log('GET /profile - Access token present:', !!accessToken);
    
//     if (accessToken) {
//       console.log('GET /profile - Token preview:', accessToken?.substring(0, 30) + '...');
//       console.log('GET /profile - Token length:', accessToken?.length);
//     }
    
//     if (!accessToken) {
//       console.log('GET /profile - ERROR: No access token in Authorization header');
//       return c.json({ error: "Unauthorized - No access token" }, 401);
//     }

//     console.log('GET /profile - Calling verifyUser()...');
//     const { user, error } = await verifyUser(accessToken);
    
//     console.log('GET /profile - Auth result:', {
//       hasUser: !!user,
//       userId: user?.id,
//       userEmail: user?.email,
//       hasError: !!error,
//       errorMessage: error?.message,
//       errorCode: error?.code,
//       errorStatus: error?.status
//     });
    
//     if (error) {
//       console.log('GET /profile - ERROR DETAILS:', JSON.stringify(error, null, 2));
//     }
    
//     if (error || !user) {
//       console.log(`GET /profile - Auth failed: ${error?.message || 'No user'}`);
//       return c.json({ 
//         error: error?.message || 'Unauthorized',
//         code: error?.status || 401,
//         details: 'Token verification failed'
//       }, 401);
//     }

//     console.log('GET /profile - User verified successfully, fetching profile...');
//     const profile = await kv.get(`user:${user.id}`);
    
//     if (!profile) {
//       console.log('GET /profile - Profile not found for user:', user.id);
//       return c.json({ error: "Profile not found" }, 404);
//     }

//     console.log('GET /profile - Profile found, returning data');
//     return c.json({ profile });
//   } catch (error) {
//     console.log(`GET /profile - Exception error: ${error}`);
//     console.log('GET /profile - Error stack:', error?.stack);
//     return c.json({ error: "Failed to get profile" }, 500);
//   }
// });

// // Update user profile
// app.put("/make-server-82bafaab/profile", async (c) => {
//   try {
//     const accessToken = c.req.header('Authorization')?.split(' ')[1];
//     if (!accessToken) {
//       return c.json({ error: "Unauthorized - No access token" }, 401);
//     }

//     console.log('PUT /profile - Calling verifyUser()...');
//     const { user, error } = await verifyUser(accessToken);
//     if (error || !user) {
//       console.log(`Auth error while updating profile: ${error?.message}`);
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     const updates = await c.req.json();
//     const currentProfile = await kv.get(`user:${user.id}`);
    
//     const updatedProfile = {
//       ...currentProfile,
//       ...updates,
//       userId: user.id,
//       updatedAt: new Date().toISOString()
//     };

//     await kv.set(`user:${user.id}`, updatedProfile);
//     return c.json({ profile: updatedProfile });
//   } catch (error) {
//     console.log(`Update profile error: ${error}`);
//     return c.json({ error: "Failed to update profile" }, 500);
//   }
// });

// // Create quotation
// app.post("/make-server-82bafaab/quotations", async (c) => {
//   console.log('POST /quotations - Request received');
//   try {
//     const accessToken = c.req.header('Authorization')?.split(' ')[1];
//     console.log('POST /quotations - Access token present:', !!accessToken);
    
//     if (!accessToken) {
//       console.log('POST /quotations - No access token provided');
//       return c.json({ error: "Unauthorized - No access token" }, 401);
//     }

//     console.log('POST /quotations - Verifying user...');
//     const { user, error } = await verifyUser(accessToken);
    
//     console.log('POST /quotations - Auth result:', {
//       hasUser: !!user,
//       userId: user?.id,
//       hasError: !!error,
//       errorMessage: error?.message
//     });
    
//     if (error || !user) {
//       console.log(`Auth error while creating quotation: ${error?.message}`);
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     console.log('POST /quotations - Parsing request body...');
//     const quotationData = await c.req.json();
//     console.log('POST /quotations - Quotation data:', quotationData);
    
//     // Generate quotation number
//     const timestamp = Date.now();
//     const quotationNumber = `OFF-${timestamp}`;
    
//     const quotation = {
//       id: `${timestamp}`,
//       quotationNumber,
//       userId: user.id,
//       clientName: quotationData.clientName,
//       clientAddress: quotationData.clientAddress,
//       description: quotationData.description,
//       price: quotationData.price,
//       vatPercentage: quotationData.vatPercentage,
//       status: quotationData.status || 'draft',
//       date: quotationData.date || new Date().toISOString(),
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     };

//     console.log('POST /quotations - Saving to KV store with key:', `quotation:${user.id}:${quotation.id}`);
//     await kv.set(`quotation:${user.id}:${quotation.id}`, quotation);
    
//     console.log('POST /quotations - Quotation created successfully!');
//     return c.json({ quotation });
//   } catch (error) {
//     console.log(`Create quotation error: ${error}`);
//     console.log('Error stack:', error?.stack);
//     return c.json({ error: "Failed to create quotation" }, 500);
//   }
// });

// // Get all quotations for user
// app.get("/make-server-82bafaab/quotations", async (c) => {
//   try {
//     const accessToken = c.req.header('Authorization')?.split(' ')[1];
//     if (!accessToken) {
//       return c.json({ error: "Unauthorized - No access token" }, 401);
//     }

//     const { user, error } = await verifyUser(accessToken);
//     if (error || !user) {
//       console.log(`Auth error while getting quotations: ${error?.message}`);
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     const quotations = await kv.getByPrefix(`quotation:${user.id}:`);
    
//     return c.json({ quotations: quotations || [] });
//   } catch (error) {
//     console.log(`Get quotations error: ${error}`);
//     return c.json({ error: "Failed to get quotations" }, 500);
//   }
// });

// // Get single quotation
// app.get("/make-server-82bafaab/quotations/:id", async (c) => {
//   try {
//     const accessToken = c.req.header('Authorization')?.split(' ')[1];
//     if (!accessToken) {
//       return c.json({ error: "Unauthorized - No access token" }, 401);
//     }

//     const { user, error } = await verifyUser(accessToken);
//     if (error || !user) {
//       console.log(`Auth error while getting quotation: ${error?.message}`);
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     const id = c.req.param('id');
//     const quotation = await kv.get(`quotation:${user.id}:${id}`);
    
//     if (!quotation) {
//       return c.json({ error: "Quotation not found" }, 404);
//     }

//     return c.json({ quotation });
//   } catch (error) {
//     console.log(`Get quotation error: ${error}`);
//     return c.json({ error: "Failed to get quotation" }, 500);
//   }
// });

// // Update quotation
// app.put("/make-server-82bafaab/quotations/:id", async (c) => {
//   try {
//     const accessToken = c.req.header('Authorization')?.split(' ')[1];
//     if (!accessToken) {
//       return c.json({ error: "Unauthorized - No access token" }, 401);
//     }

//     const { user, error } = await verifyUser(accessToken);
//     if (error || !user) {
//       console.log(`Auth error while updating quotation: ${error?.message}`);
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     const id = c.req.param('id');
//     const updates = await c.req.json();
    
//     const currentQuotation = await kv.get(`quotation:${user.id}:${id}`);
//     if (!currentQuotation) {
//       return c.json({ error: "Quotation not found" }, 404);
//     }

//     const updatedQuotation = {
//       ...currentQuotation,
//       ...updates,
//       userId: user.id,
//       id: currentQuotation.id,
//       quotationNumber: currentQuotation.quotationNumber,
//       updatedAt: new Date().toISOString()
//     };

//     await kv.set(`quotation:${user.id}:${id}`, updatedQuotation);
    
//     return c.json({ quotation: updatedQuotation });
//   } catch (error) {
//     console.log(`Update quotation error: ${error}`);
//     return c.json({ error: "Failed to update quotation" }, 500);
//   }
// });

// // Delete quotation
// app.delete("/make-server-82bafaab/quotations/:id", async (c) => {
//   try {
//     const accessToken = c.req.header('Authorization')?.split(' ')[1];
//     if (!accessToken) {
//       return c.json({ error: "Unauthorized - No access token" }, 401);
//     }

//     const { user, error } = await verifyUser(accessToken);
//     if (error || !user) {
//       console.log(`Auth error while deleting quotation: ${error?.message}`);
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     const id = c.req.param('id');
//     await kv.del(`quotation:${user.id}:${id}`);
    
//     return c.json({ success: true });
//   } catch (error) {
//     console.log(`Delete quotation error: ${error}`);
//     return c.json({ error: "Failed to delete quotation" }, 500);
//   }
// });

// Deno.serve(app.fetch);