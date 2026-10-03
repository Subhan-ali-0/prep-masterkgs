const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// PREP MASTER API SETTINGS
// =========================
const BATCHES_URL = "https://sahuvijay143.github.io/kgs_batch_list/New_Sunny.json";
const FOLDER_URL = "https://vidya.studybeepro.site/get/folder_contentsv3";
const VIDEO_URL = "https://vidya.studybeepro.site/playx/";

// =========================
// ENVIRONMENT VARIABLES
// =========================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  crypto.randomBytes(32).toString("hex");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// =========================
// SUPABASE
// =========================
let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log("Supabase client initialized.");
} else {
  console.warn(
    "WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."
  );
}

// =========================
// DEFAULT CONFIG
// =========================
const DEFAULT_CONFIG = {
  purchaseTelegram: "Subhanali011",
  telegramChannel: "prepmaster0",
  twentyFourHourUrl: "https://vplink.in/lkWPb",
  howToGenerate24hVideoUrl: "",
  howToBuyPremiumVideoUrl: ""
};

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ==================================================
// DATABASE HELPERS
// ==================================================

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function cleanTelegram(value, fallback) {
  return cleanText(value, fallback).replace(/^@/, "");
}

function cleanHttpUrl(value, fallback = "") {
  const text = cleanText(value, fallback);
  if (!text) return "";

  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return fallback;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}

// ==================================================
// CONFIG
// ==================================================

async function getConfig() {
  requireSupabase();

  const { data, error } = await supabase
    .from("pm_config")
    .select("*")
    .eq("id", "settings")
    .maybeSingle();

  if (error) throw error;

  const row = data || {};

  return {
    purchaseTelegram: cleanTelegram(
      row.purchase_telegram,
      DEFAULT_CONFIG.purchaseTelegram
    ),

    telegramChannel: cleanTelegram(
      row.telegram_channel,
      DEFAULT_CONFIG.telegramChannel
    ),

    twentyFourHourUrl: cleanHttpUrl(
      row.twenty_four_hour_url,
      DEFAULT_CONFIG.twentyFourHourUrl
    ),

    howToGenerate24hVideoUrl: cleanHttpUrl(
      row.how_to_generate_24h_video_url,
      DEFAULT_CONFIG.howToGenerate24hVideoUrl
    ),

    howToBuyPremiumVideoUrl: cleanHttpUrl(
      row.how_to_buy_premium_video_url,
      DEFAULT_CONFIG.howToBuyPremiumVideoUrl
    )
  };
}

async function saveConfig(config) {
  requireSupabase();

  const payload = {
    id: "settings",

    purchase_telegram: cleanTelegram(
      config.purchaseTelegram,
      DEFAULT_CONFIG.purchaseTelegram
    ),

    telegram_channel: cleanTelegram(
      config.telegramChannel,
      DEFAULT_CONFIG.telegramChannel
    ),

    twenty_four_hour_url: cleanHttpUrl(
      config.twentyFourHourUrl,
      DEFAULT_CONFIG.twentyFourHourUrl
    ),

    how_to_generate_24h_video_url: cleanHttpUrl(
      config.howToGenerate24hVideoUrl
    ),

    how_to_buy_premium_video_url: cleanHttpUrl(
      config.howToBuyPremiumVideoUrl
    )
  };

  const { error } = await supabase
    .from("pm_config")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

async function getStore() {
  requireSupabase();

  const [configResult, overridesResult] = await Promise.all([
    supabase
      .from("pm_config")
      .select("*")
      .eq("id", "settings")
      .maybeSingle(),

    supabase
      .from("pm_overrides")
      .select("*")
      .eq("id", "batches")
      .maybeSingle()
  ]);

  if (configResult.error) throw configResult.error;
  if (overridesResult.error) throw overridesResult.error;

  const configRow = configResult.data || {};
  const overrideRow = overridesResult.data || {};

  return {
    config: {
      purchaseTelegram: cleanTelegram(
        configRow.purchase_telegram,
        DEFAULT_CONFIG.purchaseTelegram
      ),

      telegramChannel: cleanTelegram(
        configRow.telegram_channel,
        DEFAULT_CONFIG.telegramChannel
      ),

      twentyFourHourUrl: cleanHttpUrl(
        configRow.twenty_four_hour_url,
        DEFAULT_CONFIG.twentyFourHourUrl
      ),

      howToGenerate24hVideoUrl: cleanHttpUrl(
        configRow.how_to_generate_24h_video_url
      ),

      howToBuyPremiumVideoUrl: cleanHttpUrl(
        configRow.how_to_buy_premium_video_url
      )
    },

    hiddenBatchIds: overrideRow.hidden_batch_ids || [],
    customBatches: overrideRow.custom_batches || []
  };
}

async function saveOverrides(hiddenBatchIds, customBatches) {
  requireSupabase();

  const { error } = await supabase
    .from("pm_overrides")
    .upsert(
      {
        id: "batches",
        hidden_batch_ids: hiddenBatchIds,
        custom_batches: customBatches
      },
      { onConflict: "id" }
    );

  if (error) throw error;
}

// ==================================================
// KEY HELPERS
// ==================================================

function hashKey(key) {
  return crypto
    .createHash("sha256")
    .update(String(key).trim().toUpperCase())
    .digest("hex");
}

function makeKey(prefix) {
  const random = crypto
    .randomBytes(7)
    .toString("hex")
    .toUpperCase();

  return `${prefix}-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(8, 12)}`;
}

async function getKeyByHash(hash) {
  requireSupabase();

  const { data, error } = await supabase
    .from("pm_keys")
    .select("*")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function insertKey(record) {
  requireSupabase();

  const { error } = await supabase
    .from("pm_keys")
    .insert({
      key_hash: record.hash,
      prefix: record.prefix,
      type: record.type,
      created_at: record.createdAt,
      activated_at: record.activatedAt,
      expires_at: record.expiresAt,
      revoked: record.revoked,
      uses: record.uses
    });

  if (error) throw error;
}

async function updateKey(hash, update) {
  requireSupabase();

  const payload = {};

  if (update.revoked !== undefined) {
    payload.revoked = update.revoked;
  }

  if (update.uses !== undefined) {
    payload.uses = update.uses;
  }

  if (update.activatedAt !== undefined) {
    payload.activated_at = update.activatedAt;
  }

  if (update.expiresAt !== undefined) {
    payload.expires_at = update.expiresAt;
  }

  const { error } = await supabase
    .from("pm_keys")
    .update(payload)
    .eq("key_hash", hash);

  if (error) throw error;
}

async function listKeys() {
  requireSupabase();

  const { data, error } = await supabase
    .from("pm_keys")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data || []).map((k) => ({
    hash: k.key_hash,
    prefix: k.prefix,
    type: k.type,
    createdAt: k.created_at,
    activatedAt: k.activated_at,
    expiresAt: k.expires_at,
    revoked: !!k.revoked,
    uses: Number(k.uses || 0)
  }));
}

// ==================================================
// TOKEN SYSTEM
// ==================================================

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(body)
    .digest("base64url");

  return `${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 2) return null;

    const [body, sig] = parts;

    const expected = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(body)
      .digest("base64url");

    const sigBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    );

    if (!payload.exp || Date.now() > Number(payload.exp)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ==================================================
// ADMIN AUTH
// ==================================================

function adminRequired(req, res, next) {
  const token = String(req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const payload = verifyToken(token);

  if (!payload || payload.scope !== "admin") {
    return res.status(401).json({
      success: false,
      error: "Admin login required."
    });
  }

  next();
}

// ==================================================
// FETCH JSON
// ==================================================

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "Prep-Master/2.0"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Upstream API error: ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();

  if (!text) {
    throw new Error("Upstream API returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Upstream API did not return valid JSON.");
  }
}

// ==================================================
// HEALTH
// ==================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Prep Master server is running.",
    database: supabase ? "supabase" : "not-configured",
    time: new Date().toISOString()
  });
});

// ==================================================
// PUBLIC CONFIG
// ==================================================

app.get("/api/public-config", async (req, res) => {
  try {
    const config = await getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Public config error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Backward-compatible alias for pages using /api/config
app.get("/api/config", async (req, res) => {
  try {
    const config = await getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Config alias error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================================================
// BATCHES
// ==================================================

app.get("/api/batches", async (req, res) => {
  try {
    const upstream = await fetchJson(BATCHES_URL);

    const list = Array.isArray(upstream)
      ? upstream
      : (upstream?.new || upstream?.batches || upstream?.data || []);

    const store = await getStore();
    const hidden = new Set((store.hiddenBatchIds || []).map(String));
    const custom = store.customBatches || [];

    const normalized = list
      .map((item) => ({
        ...item,
        id: item.id ?? item.course_id ?? item.courseId,
        title:
          item.title ||
          item.name ||
          item.course_name ||
          item.courseName,
        thumbnail:
          item.thumbnail ||
          item.image_large ||
          item.image_thumb ||
          item.image ||
          item.image_url ||
          item.thumbnail_url ||
          "",
        courseUrl: item.courseUrl || "",
        start_at: item.start_at || "",
        end_at: item.end_at || ""
      }))
      .filter((item) => item.id != null && !hidden.has(String(item.id)));

    const visibleCustom = custom.filter(
      (item) => item.id != null && !hidden.has(String(item.id))
    );

    const map = new Map(
      normalized.map((x) => [String(x.id), x])
    );

    for (const item of visibleCustom) {
      map.set(String(item.id), item);
    }

    res.json(Array.from(map.values()));
  } catch (error) {
    console.error("Batches API Error:", error.message);

    res.status(502).json({
      success: false,
      error: "Unable to load batches.",
      message: error.message
    });
  }
});

// ==================================================
// ADMIN LOGIN
// ==================================================

app.post("/api/admin/login", (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res.status(503).json({
      success: false,
      error: "Set ADMIN_USERNAME and ADMIN_PASSWORD in environment variables first."
    });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      error: "Invalid admin credentials."
    });
  }

  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;

  const token = signToken({
    scope: "admin",
    exp: expiresAt
  });

  res.json({
    success: true,
    token,
    expiresAt
  });
});

// ==================================================
// ADMIN LOGOUT
// ==================================================

app.post("/api/admin/logout", adminRequired, (req, res) => {
  res.json({ success: true });
});

// ==================================================
// ADMIN OVERVIEW
// ==================================================

app.get("/api/admin/overview", adminRequired, async (req, res) => {
  try {
    const store = await getStore();
    const keys = await listKeys();

    res.json({
      success: true,
      config: store.config,
      hiddenBatchIds: store.hiddenBatchIds || [],
      customBatches: store.customBatches || [],
      keys: keys.map((k) => ({
        type: k.type,
        prefix: k.prefix,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt || null,
        revoked: !!k.revoked,
        uses: k.uses || 0
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================================================
// ADMIN CONFIG
// ==================================================

app.post("/api/admin/config", adminRequired, async (req, res) => {
  try {
    const current = await getConfig();

    const config = {
      purchaseTelegram: cleanTelegram(
        req.body?.purchaseTelegram ?? current.purchaseTelegram,
        current.purchaseTelegram
      ),

      telegramChannel: cleanTelegram(
        req.body?.telegramChannel ?? current.telegramChannel,
        current.telegramChannel
      ),

      twentyFourHourUrl: cleanHttpUrl(
        req.body?.twentyFourHourUrl ?? current.twentyFourHourUrl,
        current.twentyFourHourUrl
      ),

      howToGenerate24hVideoUrl: cleanHttpUrl(
        req.body?.howToGenerate24hVideoUrl ??
          current.howToGenerate24hVideoUrl
      ),

      howToBuyPremiumVideoUrl: cleanHttpUrl(
        req.body?.howToBuyPremiumVideoUrl ??
          current.howToBuyPremiumVideoUrl
      )
    };

    await saveConfig(config);

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Save config error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================================================
// ADMIN BATCH MANAGEMENT
// ==================================================

app.post("/api/admin/batches", adminRequired, async (req, res) => {
  try {
    const store = await getStore();

    const hidden = new Set((store.hiddenBatchIds || []).map(String));
    let custom = Array.isArray(store.customBatches)
      ? [...store.customBatches]
      : [];

    const action = String(req.body?.action || "");
    const id = String(req.body?.id ?? "").trim();

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Batch ID is required."
      });
    }

    if (action === "hide") {
      hidden.add(id);
    } else if (action === "show") {
      hidden.delete(id);
    } else if (action === "add") {
      const item = {
        id,
        title: String(req.body?.title || `Batch ${id}`).trim(),
        thumbnail: String(req.body?.thumbnail || "").trim(),
        courseUrl: String(
          req.body?.courseUrl ||
            `https://vidya.studybeepro.site/content?id=${encodeURIComponent(id)}`
        ).trim(),
        custom: true
      };

      custom = custom.filter((x) => String(x.id) !== id);
      custom.push(item);
      hidden.delete(id);
    } else if (action === "remove") {
      custom = custom.filter((x) => String(x.id) !== id);
      hidden.add(id);
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid batch action."
      });
    }

    await saveOverrides(Array.from(hidden), custom);

    res.json({
      success: true,
      hiddenBatchIds: Array.from(hidden),
      customBatches: custom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================================================
// ADMIN GENERATE KEY
// ==================================================

app.post("/api/admin/generate-key", adminRequired, async (req, res) => {
  try {
    const requested = String(req.body?.type || "24h").toLowerCase();
    const type = requested === "lifetime" ? "lifetime" : "24h";
    const prefix = type === "lifetime" ? "PM-LIFE" : "PM-24H";

    let key = makeKey(prefix);
    let hash = hashKey(key);

    while (await getKeyByHash(hash)) {
      key = makeKey(prefix);
      hash = hashKey(key);
    }

    const createdAt = new Date().toISOString();

    await insertKey({
      hash,
      prefix,
      type,
      createdAt,
      revoked: false,
      uses: 0,
      activatedAt: null,
      expiresAt: null
    });

    res.json({
      success: true,
      key,
      type,
      createdAt
    });
  } catch (error) {
    console.error("Generate key error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================================================
// ADMIN LIST KEYS
// ==================================================

app.get("/api/admin/keys", adminRequired, async (req, res) => {
  try {
    const keys = await listKeys();

    res.json({
      success: true,
      keys: keys.map((k) => ({
        type: k.type,
        prefix: k.prefix,
        createdAt: k.createdAt,
        activatedAt: k.activatedAt,
        expiresAt: k.expiresAt,
        revoked: !!k.revoked,
        uses: k.uses || 0
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================================================
// ADMIN REVOKE KEY
// ==================================================

app.post("/api/admin/revoke-key", adminRequired, async (req, res) => {
  try {
    const prefix = String(req.body?.prefix || "").trim();
    const createdAt = String(req.body?.createdAt || "").trim();
    const keys = await listKeys();

    const found = keys.find(
      (k) => k.prefix === prefix && k.createdAt === createdAt
    );

    if (!found) {
      return res.status(404).json({
        success: false,
        error: "Key record not found."
      });
    }

    await updateKey(found.hash, { revoked: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================================================
// PUBLIC CLAIM 24H KEY
// ==================================================

const claimCooldown = new Map();
const CLAIM_COOLDOWN_MS = 10 * 60 * 1000;

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");

  return (
    forwarded.split(",")[0].trim() ||
    req.ip ||
    "unknown"
  );
}

app.post("/api/claim-24h", async (req, res) => {
  try {
    requireSupabase();

    const ip = getClientIp(req);
    const now = Date.now();
    const lastClaim = claimCooldown.get(ip) || 0;
    const remaining = CLAIM_COOLDOWN_MS - (now - lastClaim);

    if (remaining > 0) {
      return res.status(429).json({
        success: false,
        error: "Please wait before claiming another key.",
        retryAfterSeconds: Math.ceil(remaining / 1000)
      });
    }

    const prefix = "PM-24H";
    let key = makeKey(prefix);
    let hash = hashKey(key);

    while (await getKeyByHash(hash)) {
      key = makeKey(prefix);
      hash = hashKey(key);
    }

    const createdAt = new Date().toISOString();

    await insertKey({
      hash,
      prefix,
      type: "24h",
      createdAt,
      activatedAt: null,
      expiresAt: null,
      revoked: false,
      uses: 0
    });

    claimCooldown.set(ip, now);

    res.json({
      success: true,
      message: "Your 24-hour key has been generated.",
      key,
      type: "24h",
      createdAt
    });
  } catch (error) {
    console.error("Claim 24H key error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to generate your key. Please try again."
    });
  }
});

// ==================================================
// PREMIUM / 24H KEY VERIFICATION
// ==================================================

app.post("/api/verify-premium-key", async (req, res) => {
  try {
    const key = String(req.body?.key || "").trim();

    if (!key) {
      return res.status(400).json({
        success: false,
        error: "Enter a premium key."
      });
    }

    const hash = hashKey(key);
    const record = await getKeyByHash(hash);

    if (!record || record.revoked) {
      return res.status(401).json({
        success: false,
        error: "Invalid or revoked key."
      });
    }

    const now = Date.now();
    let expiresAt = null;

    if (record.type === "lifetime") {
      expiresAt = null;
    } else {
      if (
        record.expires_at &&
        new Date(record.expires_at).getTime() <= now
      ) {
        return res.status(401).json({
          success: false,
          error: "This 24H key has expired."
        });
      }

      expiresAt =
        record.expires_at ||
        new Date(now + 24 * 60 * 60 * 1000).toISOString();

      if (!record.activated_at) {
        await updateKey(record.key_hash, {
          activatedAt: new Date().toISOString(),
          expiresAt
        });
      }
    }

    await updateKey(record.key_hash, {
      uses: Number(record.uses || 0) + 1
    });

    const tokenPayload = {
      scope: "premium",
      type: record.type,
      exp: expiresAt
        ? new Date(expiresAt).getTime()
        : now + 1000 * 60 * 60 * 24 * 365 * 50
    };

    const token = signToken(tokenPayload);

    res.json({
      success: true,
      type: record.type,
      token,
      expiresAt
    });
  } catch (error) {
    console.error("Premium verification error:", error);

    res.status(500).json({
      success: false,
      error: "Premium verification failed."
    });
  }
});

// ==================================================
// CHECK PREMIUM
// ==================================================

app.get("/api/check-premium", (req, res) => {
  const payload = verifyToken(req.query.token);

  if (!payload || payload.scope !== "premium") {
    return res.status(401).json({
      success: false,
      valid: false
    });
  }

  const lifetime = payload.type === "lifetime";

  res.json({
    success: true,
    valid: true,
    type: payload.type,
    expiresAt: lifetime
      ? null
      : new Date(payload.exp).toISOString()
  });
});

// ==================================================
// FOLDER API
// ==================================================

app.get("/api/folder", async (req, res) => {
  try {
    const courseId = String(req.query.course_id || "").trim();
    const parentId = String(req.query.parent_id ?? "-1").trim();
    const start = String(req.query.start ?? "0").trim();

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: "course_id is required."
      });
    }

    if (!/^-?\d+$/.test(courseId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid course_id."
      });
    }

    if (!/^-?\d+$/.test(parentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid parent_id."
      });
    }

    if (!/^\d+$/.test(start)) {
      return res.status(400).json({
        success: false,
        error: "Invalid start value."
      });
    }

    const url = new URL(FOLDER_URL);
    url.searchParams.set("course_id", courseId);
    url.searchParams.set("parent_id", parentId);
    url.searchParams.set("start", start);

    const data = await fetchJson(url.toString());
    res.json(data);
  } catch (error) {
    res.status(502).json({
      success: false,
      error: "Unable to load folder contents.",
      message: error.message
    });
  }
});

// ==================================================
// VIDEO API
// ==================================================

app.get("/api/video", async (req, res) => {
  try {
    const courseId = String(req.query.course_id || "").trim();
    const videoId = String(req.query.video_id || "").trim();

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: "course_id is required."
      });
    }

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: "video_id is required."
      });
    }

    if (!/^-?\d+$/.test(courseId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid course_id."
      });
    }

    if (!/^\d+$/.test(videoId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid video_id."
      });
    }

    const url = new URL(VIDEO_URL);
    url.searchParams.set("course_id", courseId);
    url.searchParams.set("video_id", videoId);

    const data = await fetchJson(url.toString());
    res.json(data);
  } catch (error) {
    res.status(502).json({
      success: false,
      error: "Unable to load video information.",
      message: error.message
    });
  }
});

// ==================================================
// API 404
// ==================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found."
  });
});

// ==================================================
// ADMIN PAGE
// ==================================================

app.get(["/admin", "/admin/"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ==================================================
// FRONTEND
// ==================================================

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==================================================
// ERROR HANDLER
// ==================================================

app.use((error, req, res, next) => {
  console.error("Server Error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    error: "Internal server error.",
    message: error.message
  });
});

// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {
  console.log("=================================");
  console.log("       PREP MASTER SERVER");
  console.log("=================================");
  console.log(`Server running on port: ${PORT}`);
  console.log(`Supabase: ${supabase ? "Connected" : "NOT CONFIGURED"}`);
  console.log("Admin: /admin");
});

module.exports = app;
