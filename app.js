/* ============================================
   CORRETOR ENEM — APP.JS (final, só grátis)
   ============================================ */

const WORKER_URL = 'https://corretor-enem-worker.rmayormartins.workers.dev';
const STORAGE_KEY = 'corretor-enem-password';
const CALL_TIMEOUT_MS = 90000;

let accessPassword = localStorage.getItem(STORAGE_KEY) || '';

/* ============================================
   SLOTS — cada card visível na UI.
   Um "slot" mapeia pra um provider backend + um model id.
   ============================================ */
const SLOTS = {
  'gemini':      { label: 'Gemini',       vendor: 'Google',      provider: 'gemini'     },
  'groq':        { label: 'Llama (Groq)', vendor: 'Groq',        provider: 'groq'       },
  'or-deepseek': { label: 'DeepSeek',     vendor: 'DeepSeek AI', provider: 'openrouter' },
  'or-llama':    { label: 'Llama (Meta)', vendor: 'Meta',        provider: 'openrouter' },
  'or-qwen':     { label: 'Qwen',         vendor: 'Alibaba',     provider: 'openrouter' },
  'or-gemma':    { label: 'Gemma',        vendor: 'Google open', provider: 'openrouter' },
};

const COMP_SHORT = {
  c1: 'Norma padrão',
  c2: 'Tema e estrutura',
  c3: 'Argumentação',
  c4: 'Coesão',
  c5: 'Proposta de intervenção'
};

const $ = s => document.querySelector(s);

// ============== UPLOAD ==============
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
      alert('Formato não suportado. Use .docx ou .txt.');
      return;
    }
    updateStats();
  } catch (err) {
    alert('Erro ao ler arquivo: ' + err.message);
  }
}

function updateStats() {
  const text = redacaoTextarea.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const linhas = Math.ceil(chars / 75);
  $('#stat-linhas').textContent = linhas + ' linhas';
  $('#stat-palavras').textContent = words + ' palavras';
  $('#stat-chars').textContent = chars + ' caracteres';
}
redacaoTextarea.addEventListener('input', updateStats);

// ============== MODAL SENHA ==============
const modalConfig = $('#modal-config');
$('#btn-config').addEventListener('click', openConfig);
$('#btn-close-config').addEventListener('click', closeConfig);
$('.modal-backdrop').addEventListener('click', closeConfig);
$('#btn-save-config').addEventListener('click', savePassword);
$('#access-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') savePassword();
});

function openConfig() {
  $('#access-password').value = accessPassword;
  modalConfig.hidden = false;
  setTimeout(() => $('#access-password').focus(), 100);
}
function closeConfig() { modalConfig.hidden = true; }

function savePassword() {
  const pw = $('#access-password').value.trim();
  if (!pw) { alert('Informe a senha.'); return; }
  accessPassword = pw;
  localStorage.setItem(STORAGE_KEY, pw);
  closeConfig();
  checkEndpoint();
}

// ============== STATUS ==============
async function checkEndpoint() {
  const statusDot = $('.status-dot');
  const statusText = $('.status-text');
  statusDot.className = 'status-dot';

  try {
    const res = await fetch(WORKER_URL + '/health', { method: 'GET' });
    const data = await res.json();
    if (res.ok) {
      statusDot.classList.add('ok');
      const avail = data.providers_available || {};
      const totalSlots = Object.keys(SLOTS).filter(k => avail[SLOTS[k].provider]).length;
      if (!accessPassword && data.password_protection) {
        statusText.textContent = `Senha necessária · ${totalSlots} modelos grátis`;
        statusDot.classList.remove('ok');
      } else {
        statusText.textContent = `Conectado · ${totalSlots} modelos grátis disponíveis`;
      }
      console.log('[Corretor ENEM] Health:', data);
    } else throw new Error('HTTP ' + res.status);
  } catch (err) {
    statusDot.classList.add('err');
    statusText.textContent = 'Serviço inacessível';
    console.error('[Corretor ENEM] Health failed:', err);
  }
}

// ============== CORRIGIR ==============
$('#btn-corrigir').addEventListener('click', corrigir);

async function corrigir() {
  if (!accessPassword) {
    alert('Informe a senha de acesso primeiro.');
    openConfig();
    return;
  }

  const tema = $('#tema').value.trim();
  const redacao = redacaoTextarea.value.trim();
  const notaRef = $('#nota-ref-input').value ? parseInt($('#nota-ref-input').value) : null;

  if (!tema) { alert('Informe o tema proposto.'); return; }
  if (!redacao || redacao.length < 50) { alert('Cole a redação (mínimo 50 caracteres).'); return; }

  const selected = [];
  for (const slotKey of Object.keys(SLOTS)) {
    if ($(`#sel-${slotKey}`)?.checked) {
      selected.push({
        slot: slotKey,
        provider: SLOTS[slotKey].provider,
        model: $(`#model-${slotKey}`).value,
      });
    }
  }
  if (selected.length === 0) { alert('Selecione pelo menos um modelo.'); return; }

  const parallel = $('#opt-parallel').checked;
  const deterministic = $('#opt-deterministic').checked;
  const prompt = buildPrompt(tema, redacao);

  showLoading(selected);
  $('#btn-corrigir').disabled = true;

  const results = {};
  console.log('[Corretor ENEM] Iniciando correção com', selected.length, 'modelos');

  try {
    if (parallel) {
      await Promise.allSettled(selected.map(async sel => {
        const r = await callProviderSafe(sel, prompt, deterministic);
        results[sel.slot] = r;
        updateLoadingModel(sel.slot, r.error ? 'error' : 'done');
        console.log(`[${sel.slot}]`, r.error ? 'ERRO: ' + r.error : 'OK');
      }));
    } else {
      for (const sel of selected) {
        const r = await callProviderSafe(sel, prompt, deterministic);
        results[sel.slot] = r;
        updateLoadingModel(sel.slot, r.error ? 'error' : 'done');
        console.log(`[${sel.slot}]`, r.error ? 'ERRO: ' + r.error : 'OK');
      }
    }

    const allErrors = selected.every(s => results[s.slot].error);
    if (allErrors) {
      const errMsgs = selected.map(s => `• ${SLOTS[s.slot].label}: ${results[s.slot].error}`).join('\n');
      const has401 = selected.some(s => /401|senha|inválid/i.test(results[s.slot].error || ''));
      if (has401) {
        alert('Senha de acesso inválida. Clique em Acesso para tentar novamente.');
        localStorage.removeItem(STORAGE_KEY);
        accessPassword = '';
        openConfig();
      } else {
        alert('Todas as chamadas falharam:\n\n' + errMsgs);
      }
    }

    renderResults(results, selected, notaRef);
  } catch (err) {
    console.error('[Corretor ENEM] Erro geral:', err);
    alert('Erro inesperado: ' + err.message);
  } finally {
    hideLoading();
    $('#btn-corrigir').disabled = false;
  }
}

async function callProviderSafe(sel, prompt, deterministic) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  const t0 = performance.now();

  try {
    const res = await fetch(WORKER_URL + '/correct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Password': accessPassword,
      },
      body: JSON.stringify({
        provider: sel.provider,
        model: sel.model,
        prompt,
        temperature: deterministic ? 0 : 0.3
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const elapsed = Math.round(performance.now() - t0);

    const data = await res.json().catch(() => ({ error: 'Resposta inválida (não-JSON)' }));

    if (!res.ok) {
      return { error: data.error || `HTTP ${res.status}`, elapsed, model: sel.model };
    }
    if (data.error) {
      return { error: data.error, elapsed, model: sel.model };
    }

    let parsed;
    try {
      // Parser robusto: remove markdown code fences e pega o maior bloco JSON
      // entre o primeiro { e o último }. Tolera preâmbulos, posfácios, markdown.
      let raw = (data.text || '')
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        raw = raw.substring(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(raw);
    } catch (e) {
      // Log completo no console pra debug — copie isso e envie ao dev
      console.error(`[${sel.slot}] PARSE ERROR:`, e.message);
      console.error(`[${sel.slot}] RAW RESPONSE (${(data.text || '').length} chars):`, data.text);
      return {
        error: `JSON inválido (${(data.text || '').length} chars). Veja console F12 para resposta completa. Prévia: ${(data.text || '').slice(0, 100)}`,
        elapsed,
        model: sel.model
      };
    }

    return { parsed, elapsed, model: sel.model, raw: data.text };
  } catch (err) {
    clearTimeout(timeoutId);
    const elapsed = Math.round(performance.now() - t0);
    if (err.name === 'AbortError') {
      return { error: `Timeout após ${CALL_TIMEOUT_MS / 1000}s`, elapsed, model: sel.model };
    }
    return { error: err.message, elapsed, model: sel.model };
  }
}

// ============== LOADING UI ==============
function showLoading(selected) {
  $('#loading-overlay').hidden = false;
  const container = $('#loading-models');
  if (container) {
    container.innerHTML = selected.map(s => `
      <div class="model-row" data-slot="${s.slot}">
        <span>${SLOTS[s.slot].label}</span>
        <span class="pending">aguardando…</span>
      </div>
    `).join('');
  }
}
function updateLoadingModel(slotKey, status) {
  const row = $(`#loading-models [data-slot="${slotKey}"]`);
  if (!row) return;
  const span = row.querySelector('span:last-child');
  span.className = status;
  span.textContent = status === 'done' ? '✓ concluído' : status === 'error' ? '✗ erro' : 'processando…';
}
function hideLoading() { $('#loading-overlay').hidden = true; }

// ============== RESULTADOS ==============
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
    const r = results[sel.slot];
    const s = SLOTS[sel.slot];
    if (r.error) {
      return `
        <div class="summary-card" data-slot="${sel.slot}">
          <div class="summary-head"><strong>${s.label}</strong><span class="summary-model">${sel.model}</span></div>
          <div class="summary-nota" style="font-size:26px;color:var(--warn)">Erro</div>
          <div class="summary-meta" style="color:var(--warn)">${escapeHtml(r.error)}</div>
        </div>`;
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
      <div class="summary-card" data-slot="${sel.slot}">
        <div class="summary-head"><strong>${s.label}</strong><span class="summary-model">${sel.model}</span></div>
        <div class="summary-nota">${nota}<span>/1000</span></div>
        <div class="summary-meta"><span>${segs}</span>${errHtml}</div>
      </div>`;
  }).join('');
}

function renderCompMatrix(results, selected) {
  const validResults = selected.filter(s => !results[s.slot].error);
  if (validResults.length === 0) {
    $('#comp-matrix').innerHTML = '<p style="padding:24px;text-align:center;color:var(--warn)">Nenhuma LLM respondeu com sucesso.</p>';
    return;
  }
  const comps = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const header = `<tr><th>Competência</th>${validResults.map(s => `<th style="text-align:center">${SLOTS[s.slot].label}</th>`).join('')}<th style="text-align:center">Divergência</th></tr>`;
  const rows = comps.map(cid => {
    const notas = validResults.map(s => { const c = results[s.slot].parsed.competencias[cid]; return c ? c.nota : 0; });
    const div = Math.max(...notas) - Math.min(...notas);
    const divClass = div >= 80 ? 'div-cell' : '';
    const cells = notas.map(n => `<td class="nota-cell nota-${n}">${n}</td>`).join('');
    return `<tr><td><div class="comp-label">${cid.toUpperCase()}</div><span class="comp-desc">${COMP_SHORT[cid]}</span></td>${cells}<td class="nota-cell ${divClass}">±${div}</td></tr>`;
  }).join('');
  const totais = validResults.map(s => results[s.slot].parsed.nota_final || 0);
  const divTot = Math.max(...totais) - Math.min(...totais);
  const totalRow = `<tr><td><div class="comp-label">NOTA FINAL</div><span class="comp-desc">soma das 5 competências</span></td>${totais.map(t => `<td class="nota-cell">${t}</td>`).join('')}<td class="nota-cell ${divTot >= 200 ? 'div-cell' : ''}">±${divTot}</td></tr>`;
  $('#comp-matrix').innerHTML = `<table><thead>${header}</thead><tbody>${rows}${totalRow}</tbody></table>`;
}

function renderDetails(results, selected) {
  const grid = $('#details-grid');
  grid.innerHTML = selected.filter(s => !results[s.slot].error).map(sel => {
    const r = results[sel.slot].parsed;
    const s = SLOTS[sel.slot];
    const dotClass = 'dot-' + sel.slot.replace('or-', '');

    const comps = ['c1','c2','c3','c4','c5'].map(cid => {
      const c = r.competencias[cid];
      if (!c) return '';
      return `<div class="comp-detail"><div class="comp-detail-head"><span class="comp-detail-name">${cid.toUpperCase()} · ${COMP_SHORT[cid]}</span><span class="comp-detail-nota nota-${c.nota}">${c.nota}</span></div><div class="comp-detail-text">${escapeHtml(c.justificativa || '')}</div>${c.evidencia ? `<div class="comp-detail-evidence">"${escapeHtml(c.evidencia)}"</div>` : ''}</div>`;
    }).join('');
    const zeramento = r.zeramento ? `<div class="comp-detail" style="background:rgba(163,58,31,0.08);padding:10px;margin-top:-10px"><strong style="color:var(--warn)">⚠ Zeramento:</strong> ${escapeHtml(r.zeramento)}</div>` : '';
    const obs = r.observacao_geral ? `<div class="comp-detail" style="border-top:1px solid var(--line-soft);padding-top:12px;margin-top:12px"><span class="comp-detail-name">Observação geral</span><div class="comp-detail-text" style="margin-top:4px">${escapeHtml(r.observacao_geral)}</div></div>` : '';
    return `<div class="detail-card"><div class="detail-head"><span class="dot ${dotClass}"></span><strong>${s.label}</strong><span class="muted" style="font-family:var(--mono);font-size:11px">${sel.model}</span></div>${zeramento}${comps}${obs}</div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

// ============== PAINEL DE PROMPT EDITÁVEL ==============
const promptTextarea = $('#prompt-template');
const promptStatus = $('#prompt-status');
const profileSelect = $('#profile-select');

function initPromptPanel() {
  // Carrega template atual (custom ou padrão)
  promptTextarea.value = getCurrentPromptTemplate();
  updatePromptStatus();
  refreshProfileList();
}

function updatePromptStatus() {
  const modified = isPromptModified();
  promptStatus.textContent = modified ? '(MODIFICADO)' : '(padrão)';
  promptStatus.className = modified ? 'muted prompt-modified' : 'muted';

  // Adiciona classe visual no painel todo quando modificado
  const panel = $('#prompt-panel');
  if (panel) panel.classList.toggle('is-modified', modified);
}

function refreshProfileList() {
  const profiles = getProfiles();
  const names = Object.keys(profiles).sort();
  profileSelect.innerHTML = '<option value="">— selecione —</option>' +
    names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

$('#btn-save-prompt').addEventListener('click', () => {
  const newTemplate = promptTextarea.value;
  if (!newTemplate.includes('{{RUBRICA}}') || !newTemplate.includes('{{TEMA}}') || !newTemplate.includes('{{REDACAO}}')) {
    if (!confirm('ATENÇÃO: o template não contém um ou mais placeholders obrigatórios ({{RUBRICA}}, {{TEMA}}, {{REDACAO}}). Isso pode quebrar a avaliação. Deseja salvar mesmo assim?')) {
      return;
    }
  }
  setCurrentPromptTemplate(newTemplate);
  updatePromptStatus();
  alert('✓ Prompt aplicado. Próximas correções usarão este template.');
});

$('#btn-reset-prompt').addEventListener('click', () => {
  if (confirm('Restaurar o prompt para o padrão original? Suas alterações não salvas em perfil serão perdidas.')) {
    resetPromptToDefault();
    promptTextarea.value = PROMPT_TEMPLATE_DEFAULT;
    updatePromptStatus();
  }
});

$('#btn-save-profile').addEventListener('click', () => {
  const name = prompt('Nome do perfil (ex: "com-cot", "severo", "few-shot"):');
  if (!name || !name.trim()) return;
  const clean = name.trim();
  if (getProfiles()[clean]) {
    if (!confirm(`Perfil "${clean}" já existe. Sobrescrever?`)) return;
  }
  saveProfile(clean, promptTextarea.value);
  refreshProfileList();
  profileSelect.value = clean;
  alert(`✓ Perfil "${clean}" salvo.`);
});

$('#btn-load-profile').addEventListener('click', () => {
  const name = profileSelect.value;
  if (!name) { alert('Selecione um perfil primeiro.'); return; }
  const template = loadProfile(name);
  if (template) {
    promptTextarea.value = template;
    setCurrentPromptTemplate(template);
    updatePromptStatus();
    alert(`✓ Perfil "${name}" carregado e aplicado.`);
  }
});

$('#btn-delete-profile').addEventListener('click', () => {
  const name = profileSelect.value;
  if (!name) { alert('Selecione um perfil primeiro.'); return; }
  if (confirm(`Excluir o perfil "${name}" permanentemente?`)) {
    deleteProfile(name);
    refreshProfileList();
  }
});

$('#btn-preview-prompt').addEventListener('click', () => {
  const tema = $('#tema').value.trim() || '[TEMA NÃO PREENCHIDO]';
  const redacao = $('#redacao').value.trim() || '[REDAÇÃO NÃO PREENCHIDA]';

  // Salva temporariamente o template atual do textarea pra fazer preview
  const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  localStorage.setItem(TEMPLATE_STORAGE_KEY, promptTextarea.value);
  const preview = buildPrompt(tema, redacao);
  // Restaura
  if (saved === null) localStorage.removeItem(TEMPLATE_STORAGE_KEY);
  else localStorage.setItem(TEMPLATE_STORAGE_KEY, saved);

  // Abre uma janela com o preview
  const w = window.open('', 'preview', 'width=900,height=700,scrollbars=yes');
  w.document.write(`
    <html><head><title>Preview do prompt final</title>
    <style>
      body { font-family: monospace; padding: 24px; background: #fbfaf5; color: #1a1a1a; line-height: 1.5; }
      h1 { font-family: serif; font-weight: 400; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
      pre { white-space: pre-wrap; word-wrap: break-word; background: white; padding: 16px; border: 1px solid #ccc; font-size: 12px; }
      .info { background: #e8f4e8; padding: 12px; border-left: 3px solid #2d5016; margin-bottom: 16px; font-family: sans-serif; font-size: 13px; }
    </style></head><body>
    <h1>Preview do prompt que será enviado</h1>
    <div class="info">Este é o prompt final após substituição dos placeholders. Tamanho: <strong>${preview.length} caracteres</strong> (~${Math.round(preview.length/4)} tokens estimados).</div>
    <pre>${escapeHtml(preview)}</pre>
    </body></html>
  `);
});

// Detecta edição não salva no textarea
promptTextarea.addEventListener('input', () => {
  const current = getCurrentPromptTemplate();
  const textareaValue = promptTextarea.value;
  if (textareaValue !== current) {
    promptStatus.textContent = '(alterações não aplicadas)';
    promptStatus.className = 'muted prompt-pending';
  } else {
    updatePromptStatus();
  }
});

// ============== INIT ==============
updateStats();
checkEndpoint();
initPromptPanel();
if (!accessPassword) setTimeout(openConfig, 400);
