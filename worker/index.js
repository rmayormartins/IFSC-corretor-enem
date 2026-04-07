/**
 * ============================================
 * CORRETOR ENEM — Cloudflare Worker (Proxy)
 * ============================================
 *
 * Este Worker atua como backend seguro entre o site estático
 * (GitHub Pages) e as APIs das LLMs (OpenAI, Anthropic, Google, OpenRouter).
 *
 * As chaves de API ficam armazenadas como SECRETS no Cloudflare
 * (via `wrangler secret put` ou no painel), jamais expostas ao frontend.
 *
 * Endpoints:
 *   GET  /health   → teste de conectividade
 *   POST /correct  → repassa o prompt para o provedor escolhido
 *
 * Deploy (ver README.md):
 *   npm install -g wrangler
 *   wrangler login
 *   wrangler deploy
 *   wrangler secret put OPENAI_API_KEY
 *   wrangler secret put ANTHROPIC_API_KEY
 *   wrangler secret put GOOGLE_API_KEY
 *   wrangler secret put OPENROUTER_API_KEY
 */

// ⚠️ IMPORTANTE: restrinja aqui o(s) domínio(s) do seu GitHub Pages.
// Isso impede que outros sites usem suas chaves.
const ALLOWED_ORIGINS = [
  'https://rmayormartins.github.io',
  'http://localhost:8000',      // dev local
  'http://127.0.0.1:5500',      // VS Code Live Server
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'corretor-enem-worker' }, 200, origin);
    }

    // Endpoint principal
    if (url.pathname === '/correct' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { provider, model, prompt, temperature = 0 } = body;

        if (!provider || !model || !prompt) {
          return json({ error: 'Campos obrigatórios: provider, model, prompt' }, 400, origin);
        }

        let result;
        switch (provider) {
          case 'openai':
            result = await callOpenAI(env.OPENAI_API_KEY, model, prompt, temperature);
            break;
          case 'anthropic':
            result = await callAnthropic(env.ANTHROPIC_API_KEY, model, prompt, temperature);
            break;
          case 'google':
            result = await callGoogle(env.GOOGLE_API_KEY, model, prompt, temperature);
            break;
          case 'openrouter':
            result = await callOpenRouter(env.OPENROUTER_API_KEY, model, prompt, temperature);
            break;
          default:
            return json({ error: 'Provedor desconhecido: ' + provider }, 400, origin);
        }

        return json(result, 200, origin);
      } catch (err) {
        return json({ error: err.message }, 500, origin);
      }
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};

// ============== OPENAI ==============
async function callOpenAI(apiKey, model, prompt, temperature) {
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada no Worker');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error('OpenAI: ' + (data.error?.message || res.status));

  return { text: data.choices[0].message.content, provider: 'openai' };
}

// ============== ANTHROPIC ==============
async function callAnthropic(apiKey, model, prompt, temperature) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no Worker');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error('Anthropic: ' + (data.error?.message || res.status));

  return { text: data.content[0].text, provider: 'anthropic' };
}

// ============== GOOGLE GEMINI ==============
async function callGoogle(apiKey, model, prompt, temperature) {
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada no Worker');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error('Google: ' + (data.error?.message || res.status));

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, provider: 'google' };
}

// ============== OPENROUTER (open-source) ==============
async function callOpenRouter(apiKey, model, prompt, temperature) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurada no Worker');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://rmayormartins.github.io/',
      'X-Title': 'Corretor ENEM (pesquisa)',
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
