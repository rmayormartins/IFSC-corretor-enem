/**
 * ============================================
 * CORRETOR ENEM — Cloudflare Worker (final)
 * ============================================
 * Apenas provedores gratuitos: Gemini, Groq, OpenRouter.
 * Autenticação por senha + rate limit por IP.
 */

const ALLOWED_ORIGINS = [
  'https://rmayormartins.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
];

const RATE_LIMIT_MAX = 40;
const RATE_LIMIT_WINDOW_MS = 3600_000; // 1 hora
const rateLimitMap = new Map();

function isAllowed(origin) {
  if (!origin) return false;
  const clean = origin.replace(/\/$/, '');
  return ALLOWED_ORIGINS.includes(clean);
}

function corsHeaders(origin) {
  const allowed = isAllowed(origin) ? origin.replace(/\/$/, '') : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Access-Password',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return {
    allowed: entry.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - entry.count),
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({
        ok: true,
        service: 'corretor-enem-worker',
        version: 'final',
        origin_received: origin,
        origin_allowed: isAllowed(origin),
        providers_available: {
          gemini: !!env.GOOGLE_API_KEY,
          groq: !!env.GROQ_API_KEY,
          openrouter: !!env.OPENROUTER_API_KEY,
        },
        password_protection: !!env.ACCESS_PASSWORD,
      }, 200, origin);
    }

    // Endpoint principal /correct
    if (url.pathname === '/correct' && request.method === 'POST') {
      // 1. Valida senha
      if (env.ACCESS_PASSWORD) {
        const providedPassword = request.headers.get('X-Access-Password') || '';
        if (providedPassword !== env.ACCESS_PASSWORD) {
          return json({ error: 'Senha de acesso inválida ou ausente.' }, 401, origin);
        }
      }

      // 2. Valida rate limit
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return json({
          error: `Rate limit excedido (${RATE_LIMIT_MAX}/hora). Tente novamente em ${Math.ceil(rl.resetIn / 60)} minutos.`
        }, 429, origin);
      }

      // 3. Processa a correção
      try {
        const body = await request.json();
        const { provider, model, prompt, temperature = 0 } = body;

        if (!provider || !model || !prompt) {
          return json({ error: 'Campos obrigatórios: provider, model, prompt' }, 400, origin);
        }

        let result;
        switch (provider) {
          case 'gemini':
          case 'google':
            result = await callGoogle(env.GOOGLE_API_KEY, model, prompt, temperature);
            break;
          case 'groq':
            result = await callGroq(env.GROQ_API_KEY, model, prompt, temperature);
            break;
          case 'openrouter':
            result = await callOpenRouter(env.OPENROUTER_API_KEY, model, prompt, temperature);
            break;
          default:
            return json({ error: 'Provedor desconhecido: ' + provider }, 400, origin);
        }

        result.rate_limit_remaining = rl.remaining;
        return json(result, 200, origin);
      } catch (err) {
        console.error('Worker error:', err);
        return json({ error: err.message }, 500, origin);
      }
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};

// ============== GROQ (grátis) ==============
async function callGroq(apiKey, model, prompt, temperature) {
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada no Worker');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error('Groq: ' + (data.error?.message || res.status));
  return { text: data.choices[0].message.content, provider: 'groq' };
}

// ============== GOOGLE GEMINI (grátis tier) ==============
async function callGoogle(apiKey, model, prompt, temperature) {
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada no Worker');

  // NOTA: removido responseMimeType='application/json' porque causa bugs
  // conhecidos com prompts longos (filtro de RECITATION).
  // Safety settings relaxados para temas sensíveis comuns em redações do ENEM.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 2000,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error('Google: ' + (data.error?.message || res.status));

  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('Google: sem candidatos na resposta');
  if (candidate.finishReason === 'SAFETY') throw new Error('Google: bloqueado por filtro de segurança');
  if (candidate.finishReason === 'RECITATION') throw new Error('Google: bloqueado por filtro de recitação');

  const text = candidate.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Google: resposta vazia (finishReason=' + candidate.finishReason + ')');
  return { text, provider: 'gemini' };
}

// ============== OPENROUTER (modelos :free) ==============
async function callOpenRouter(apiKey, model, prompt, temperature) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurada no Worker');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://rmayormartins.github.io/IFSC-corretor-enem/',
      'X-Title': 'Corretor ENEM (pesquisa IFSC)',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 2000,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error('OpenRouter: ' + (data.error?.message || res.status));
  return { text: data.choices[0].message.content, provider: 'openrouter' };
}
