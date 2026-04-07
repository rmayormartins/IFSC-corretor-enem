/* ============================================
   CORRETOR ENEM — APP.JS
   Frontend da ferramenta de comparação de LLMs
   ============================================ */

// ============== ESTADO ==============
const STORAGE_KEY = 'corretor-enem-config';

let config = {
  workerUrl: localStorage.getItem(STORAGE_KEY) || ''
};

const PROVIDERS = {
  openai:     { label: 'GPT',         vendor: 'OpenAI',    color: '#10a37f' },
  anthropic:  { label: 'Claude',      vendor: 'Anthropic', color: '#c15f3c' },
  google:     { label: 'Gemini',      vendor: 'Google',    color: '#4285f4' },
  openrouter: { label: 'Open-source', vendor: 'OpenRouter',color: '#8b5cf6' }
};

const COMP_SHORT = {
  c1: 'Norma padrão',
  c2: 'Tema e estrutura',
  c3: 'Argumentação',
  c4: 'Coesão',
  c5: 'Proposta de intervenção'
};

// ============== HELPERS DOM ==============
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ============== UPLOAD DE ARQUIVO ==============
const dropZone = $('#drop-zone');
const fileInput = $('#file-input');
const redacaoTextarea = $('#redacao');

$('#btn-browse').addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

['dragenter', 'dragover'].forEach(ev => {
  dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('drag'); });
});
['dragleave', 'drop'].forEach(ev => {
  dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('drag'); });
});
dropZone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

async function handleFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.docx')) {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      redacaoTextarea.value = result.value.trim();
    } else if (name.endsWith('.txt')) {
      const text = await file.text();
      redacaoTextarea.value = text.trim();
    } else {
      alert('Formato não suportado. Use .docx ou .txt (ou cole o texto diretamente).');
      return;
    }
    updateStats();
  } catch (err) {
    alert('Erro ao ler arquivo: ' + err.message);
  }
}

// ============== STATS DA REDAÇÃO ==============
function updateStats() {
  const text = redacaoTextarea.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Linhas aproximadas — considera ~75 caracteres por linha manuscrita do ENEM
  const linhas = Math.ceil(chars / 75);
  $('#stat-linhas').textContent = linhas + ' linhas';
  $('#stat-palavras').textContent = words + ' palavras';
  $('#stat-chars').textContent = chars + ' caracteres';
}
redacaoTextarea.addEventListener('input', updateStats);

// ============== MODAL CONFIG ==============
const modalConfig = $('#modal-config');
$('#btn-config').addEventListener('click', openConfig);
$('#btn-close-config').addEventListener('click', closeConfig);
$('.modal-backdrop').addEventListener('click', closeConfig);
$('#btn-save-config').addEventListener('click', saveConfig);

function openConfig() {
  $('#worker-url').value = config.workerUrl;
  modalConfig.hidden = false;
}
function closeConfig() { modalConfig.hidden = true; }
function saveConfig() {
  const url = $('#worker-url').value.trim().replace(/\/$/, '');
  if (url && !url.startsWith('https://')) {
    alert('A URL do Worker deve começar com https://');
    return;
  }
  config.workerUrl = url;
  localStorage.setItem(STORAGE_KEY, url);
  closeConfig();
  checkEndpoint();
}

// ============== STATUS DO ENDPOINT ==============
async function checkEndpoint() {
  const statusDot = $('.status-dot');
  const statusText = $('.status-text');
  statusDot.className = 'status-dot';

  if (!config.workerUrl) {
    statusText.textContent = 'Endpoint não configurado — clique em Configurar';
    return;
  }

  try {
    const res = await fetch(config.workerUrl + '/health', { method: 'GET' });
    if (res.ok) {
      statusDot.classList.add('ok');
      statusText.textContent = 'Endpoint conectado · ' + new URL(config.workerUrl).hostname;
    } else {
      throw new Error('HTTP ' + res.status);
    }
  } catch (err) {
    statusDot.classList.add('err');
    statusText.textContent = 'Endpoint inacessível — verifique a URL';
  }
}

// ============== BOTÃO CORRIGIR ==============
$('#btn-corrigir').addEventListener('click', corrigir);

async function corrigir() {
  const tema = $('#tema').value.trim();
  const redacao = redacaoTextarea.value.trim();
  const notaRef = $('#nota-ref-input').value ? parseInt($('#nota-ref-input').value) : null;

  if (!config.workerUrl) {
    alert('Configure primeiro a URL do Cloudflare Worker (botão Configurar).');
    openConfig();
    return;
  }
  if (!tema) { alert('Informe o tema proposto.'); return; }
  if (!redacao || redacao.length < 50) { alert('Cole a redação (mínimo 50 caracteres).'); return; }

  // Quais provedores estão selecionados
  const selected = [];
  for (const p of Object.keys(PROVIDERS)) {
    if ($(`#sel-${p}`).checked) {
      selected.push({
        provider: p,
        model: $(`#model-${p}`).value
      });
    }
  }
  if (selected.length === 0) {
    alert('Selecione pelo menos um modelo para corrigir.');
    return;
  }

  const parallel = $('#opt-parallel').checked;
  const deterministic = $('#opt-deterministic').checked;
  const prompt = buildPrompt(tema, redacao);

  // UI loading
  showLoading(selected);
  $('#btn-corrigir').disabled = true;

  const results = {};

  try {
    if (parallel) {
      await Promise.allSettled(selected.map(async sel => {
        const r = await callProvider(sel, prompt, deterministic);
        results[sel.provider] = r;
        updateLoadingModel(sel.provider, r.error ? 'error' : 'done');
      }));
    } else {
      for (const sel of selected) {
        const r = await callProvider(sel, prompt, deterministic);
        results[sel.provider] = r;
        updateLoadingModel(sel.provider, r.error ? 'error' : 'done');
      }
    }
    renderResults(results, selected, notaRef);
  } catch (err) {
    alert('Erro na correção: ' + err.message);
  } finally {
    hideLoading();
    $('#btn-corrigir').disabled = false;
  }
}

// ============== CHAMADA AO WORKER ==============
async function callProvider({ provider, model }, prompt, deterministic) {
  const t0 = performance.now();
  try {
    const res = await fetch(config.workerUrl + '/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        model,
        prompt,
        temperature: deterministic ? 0 : 0.3
      })
    });
    const data = await res.json();
    const elapsed = Math.round(performance.now() - t0);

    if (!res.ok) return { error: data.error || ('HTTP ' + res.status), elapsed, model };

    // Parse JSON da resposta da LLM
    let parsed;
    try {
      const raw = data.text.replace(/```json|```/g, '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch (e) {
      return { error: 'Resposta não-JSON: ' + data.text.slice(0, 120), elapsed, model };
    }

    return { parsed, elapsed, model, raw: data.text };
  } catch (err) {
    return { error: err.message, elapsed: 0, model };
  }
}

// ============== LOADING UI ==============
function showLoading(selected) {
  $('#loading-overlay').hidden = false;
  const container = $('#loading-models');
  container.innerHTML = selected.map(s => `
    <div class="model-row" data-p="${s.provider}">
      <span>${PROVIDERS[s.provider].label} (${s.model})</span>
      <span class="pending">aguardando…</span>
    </div>
  `).join('');
}
function updateLoadingModel(provider, status) {
  const row = $(`#loading-models [data-p="${provider}"]`);
  if (!row) return;
  const span = row.querySelector('span:last-child');
  span.className = status;
  span.textContent = status === 'done' ? '✓ concluído' : status === 'error' ? '✗ erro' : 'processando…';
}
function hideLoading() { $('#loading-overlay').hidden = true; }

// ============== RENDERIZAÇÃO DOS RESULTADOS ==============
function renderResults(results, selected, notaRef) {
  $('#results-section').hidden = false;

  renderSummaryCards(results, selected, notaRef);
  renderCompMatrix(results, selected);
  renderDetails(results, selected);

  $('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSummaryCards(results, selected, notaRef) {
  const grid = $('#summary-grid');
  grid.innerHTML = selected.map(sel => {
    const r = results[sel.provider];
    const p = PROVIDERS[sel.provider];

    if (r.error) {
      return `
        <div class="summary-card" data-provider="${sel.provider}">
          <div class="summary-head">
            <strong>${p.label}</strong>
            <span class="summary-model">${sel.model}</span>
          </div>
          <div class="summary-nota" style="font-size:26px;color:var(--warn)">Erro</div>
          <div class="summary-meta" style="color:var(--warn)">${r.error}</div>
        </div>
      `;
    }

    const nota = r.parsed.nota_final || 0;
    const segs = r.elapsed ? (r.elapsed / 1000).toFixed(1) + 's' : '—';
    let errHtml = '';
    if (notaRef !== null) {
      const erro = Math.abs(nota - notaRef);
      const cls = erro <= 80 ? 'err-ok' : 'err-bad';
      errHtml = `<span class="${cls}">erro vs. ref: ±${erro}</span>`;
    }

    return `
      <div class="summary-card" data-provider="${sel.provider}">
        <div class="summary-head">
          <strong>${p.label}</strong>
          <span class="summary-model">${sel.model}</span>
        </div>
        <div class="summary-nota">${nota}<span>/1000</span></div>
        <div class="summary-meta">
          <span>${segs}</span>
          ${errHtml}
        </div>
      </div>
    `;
  }).join('');
}

function renderCompMatrix(results, selected) {
  const validResults = selected.filter(s => !results[s.provider].error);
  const comps = ['c1', 'c2', 'c3', 'c4', 'c5'];

  const header = `
    <tr>
      <th>Competência</th>
      ${validResults.map(s => `<th style="text-align:center">${PROVIDERS[s.provider].label}</th>`).join('')}
      <th style="text-align:center">Divergência</th>
    </tr>
  `;

  const rows = comps.map(cid => {
    const notas = validResults.map(s => {
      const c = results[s.provider].parsed.competencias[cid];
      return c ? c.nota : 0;
    });
    const max = Math.max(...notas);
    const min = Math.min(...notas);
    const div = max - min;
    const divClass = div >= 80 ? 'div-cell' : '';

    const cells = notas.map(n =>
      `<td class="nota-cell nota-${n}">${n}</td>`
    ).join('');

    return `
      <tr>
        <td>
          <div class="comp-label">${cid.toUpperCase()}</div>
          <span class="comp-desc">${COMP_SHORT[cid]}</span>
        </td>
        ${cells}
        <td class="nota-cell ${divClass}">±${div}</td>
      </tr>
    `;
  }).join('');

  // Linha total
  const totais = validResults.map(s => results[s.provider].parsed.nota_final || 0);
  const maxTot = Math.max(...totais);
  const minTot = Math.min(...totais);
  const divTot = maxTot - minTot;
  const totalRow = `
    <tr>
      <td><div class="comp-label">NOTA FINAL</div><span class="comp-desc">soma das 5 competências</span></td>
      ${totais.map(t => `<td class="nota-cell">${t}</td>`).join('')}
      <td class="nota-cell ${divTot >= 200 ? 'div-cell' : ''}">±${divTot}</td>
    </tr>
  `;

  $('#comp-matrix').innerHTML = `
    <table>
      <thead>${header}</thead>
      <tbody>${rows}${totalRow}</tbody>
    </table>
  `;
}

function renderDetails(results, selected) {
  const grid = $('#details-grid');
  grid.innerHTML = selected.filter(s => !results[s.provider].error).map(sel => {
    const r = results[sel.provider].parsed;
    const p = PROVIDERS[sel.provider];

    const comps = ['c1','c2','c3','c4','c5'].map(cid => {
      const c = r.competencias[cid];
      if (!c) return '';
      return `
        <div class="comp-detail">
          <div class="comp-detail-head">
            <span class="comp-detail-name">${cid.toUpperCase()} · ${COMP_SHORT[cid]}</span>
            <span class="comp-detail-nota nota-${c.nota}">${c.nota}</span>
          </div>
          <div class="comp-detail-text">${escapeHtml(c.justificativa || '')}</div>
          ${c.evidencia ? `<div class="comp-detail-evidence">"${escapeHtml(c.evidencia)}"</div>` : ''}
        </div>
      `;
    }).join('');

    const zeramento = r.zeramento ? `
      <div class="comp-detail" style="background:rgba(163,58,31,0.08);padding:10px;margin-top:-10px">
        <strong style="color:var(--warn)">⚠ Zeramento:</strong> ${escapeHtml(r.zeramento)}
      </div>
    ` : '';

    const obs = r.observacao_geral ? `
      <div class="comp-detail" style="border-top:1px solid var(--line-soft);padding-top:12px;margin-top:12px">
        <span class="comp-detail-name">Observação geral</span>
        <div class="comp-detail-text" style="margin-top:4px">${escapeHtml(r.observacao_geral)}</div>
      </div>
    ` : '';

    return `
      <div class="detail-card">
        <div class="detail-head">
          <span class="dot dot-${sel.provider === 'openrouter' ? 'os' : sel.provider}"></span>
          <strong>${p.label}</strong>
          <span class="muted" style="font-family:var(--mono);font-size:11px">${sel.model}</span>
        </div>
        ${zeramento}
        ${comps}
        ${obs}
      </div>
    `;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ============== INIT ==============
updateStats();
checkEndpoint();
if (!config.workerUrl) {
  setTimeout(openConfig, 400);
}
