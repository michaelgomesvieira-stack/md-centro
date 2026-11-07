// Função serverless da Vercel: guarda e entrega os dados do painel.
//   GET  /api/data?mode=novo|retirado  -> { data, savedAt }
//   POST /api/data  { action:"check"|"save", password, mode, data }
// Variáveis de ambiente:
//   ADMIN_PASSWORD                         senha para importar/salvar
//   UPSTASH_REDIS_REST_URL / _TOKEN        (ou KV_REST_API_URL / _TOKEN), criadas pela integração Upstash Redis
const { Redis } = require("@upstash/redis");
const crypto = require("crypto");

const MODES = ["novo", "retirado"];
const MAX_CHARS = 900000; // limite de segurança por documento
const MAX_FAILS = 10;     // tentativas erradas por IP
const BLOCK_SECS = 900;   // bloqueio de 15 min

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

function passwordOk(p) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof p !== "string") return false;
  const h = s => crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(h(p), h(expected));
}

function validData(d) {
  if (!d || typeof d !== "object") return false;
  for (const k of ["resp", "loc", "base", "dim"]) {
    if (!Array.isArray(d[k]) || !d[k].every(s => typeof s === "string")) return false;
  }
  if (!Array.isArray(d.rows) || !d.rows.length) return false;
  return d.rows.every(r => Array.isArray(r) && r.length >= 6 && typeof r[0] === "number" &&
    r[1] < d.resp.length && r[2] < d.loc.length && r[3] < d.base.length && r[4] < d.dim.length);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const redis = getRedis();
  try {
    if (req.method === "GET") {
      const mode = req.query && req.query.mode;
      if (!MODES.includes(mode)) return res.status(400).json({ error: "Modo inválido." });
      if (!redis) return res.status(200).json({ data: null, configured: false });
      const doc = await redis.get("medidores:" + mode);
      return res.status(200).json({ data: doc ? doc.data : null, savedAt: doc ? doc.savedAt : null, configured: true });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
    if (!body || typeof body !== "object") return res.status(400).json({ error: "Requisição inválida." });

    if (!process.env.ADMIN_PASSWORD) {
      return res.status(503).json({ error: "ADMIN_PASSWORD não está configurada na Vercel." });
    }

    const ip = String(req.headers["x-forwarded-for"] || "anon").split(",")[0].trim();
    const rlKey = "rl:" + ip;
    if (redis && Number(await redis.get(rlKey)) >= MAX_FAILS) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }

    if (!passwordOk(body.password)) {
      if (redis) { const n = await redis.incr(rlKey); if (n === 1) await redis.expire(rlKey, BLOCK_SECS); }
      return res.status(401).json({ error: "Senha incorreta." });
    }
    if (redis) await redis.del(rlKey);

    if (body.action === "check") return res.status(200).json({ ok: true });

    if (body.action === "save") {
      if (!redis) return res.status(503).json({ error: "Banco de dados não configurado (Upstash Redis)." });
      if (!MODES.includes(body.mode)) return res.status(400).json({ error: "Modo inválido." });
      if (!validData(body.data)) return res.status(400).json({ error: "Dados inválidos." });
      if (JSON.stringify(body.data).length > MAX_CHARS) return res.status(413).json({ error: "Planilha grande demais." });
      const d = body.data;
      const savedAt = new Date().toISOString();
      await redis.set("medidores:" + body.mode, {
        data: { resp: d.resp, loc: d.loc, base: d.base, dim: d.dim, rows: d.rows }, savedAt
      });
      return res.status(200).json({ ok: true, savedAt });
    }

    return res.status(400).json({ error: "Ação inválida." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro no servidor." });
  }
};
