# Corretor ENEM — Comparador de LLMs

Ferramenta de pesquisa educacional para comparação de LLMs (GPT, Claude, Gemini, open-source) na correção de redações segundo as **5 competências do ENEM/Inep**.

> ⚠️ **Aviso pedagógico**: esta ferramenta é de apoio à pesquisa e ao ensino. Não substitui a avaliação humana nem constitui correção oficial.

---

## Arquitetura

```
┌──────────────────┐        ┌─────────────────────┐        ┌──────────────┐
│  GitHub Pages    │  HTTPS │  Cloudflare Worker  │  HTTPS │   LLM APIs   │
│  (HTML/CSS/JS)   │ ─────▶ │  (guarda as chaves) │ ─────▶ │  GPT/Claude/ │
│  rmayormartins   │        │  corretor-enem-     │        │  Gemini/OR   │
│  .github.io      │        │  worker.dev         │        │              │
└──────────────────┘        └─────────────────────┘        └──────────────┘
```

- **Frontend estático** hospedado no GitHub Pages (grátis, URL bonita).
- **Cloudflare Worker** como proxy seguro — as chaves de API ficam como *secrets* no Cloudflare, **nunca** expostas ao navegador.
- CORS restrito ao seu domínio do GitHub Pages para evitar abuso.

---

## Parte 1 — Deploy do Cloudflare Worker (backend)

### 1.1. Requisitos

- Conta gratuita no [Cloudflare](https://dash.cloudflare.com/sign-up)
- Node.js 18+ instalado localmente
- Chaves de API dos provedores que for usar:
  - [OpenAI](https://platform.openai.com/api-keys)
  - [Anthropic](https://console.anthropic.com/)
  - [Google AI Studio](https://aistudio.google.com/app/apikey)
  - [OpenRouter](https://openrouter.ai/keys) (dá acesso a Llama, Qwen, DeepSeek etc. com uma chave só)

### 1.2. Instalar o Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 1.3. Deploy do Worker

```bash
cd worker
wrangler deploy
```

Saída esperada:
```
Published corretor-enem-worker
  https://corretor-enem-worker.SEU-USUARIO.workers.dev
```

Anote essa URL — é ela que você vai colar no site.

### 1.4. Configurar as chaves como secrets

Rode **apenas** para os provedores que for usar:

```bash
wrangler secret put OPENAI_API_KEY
# cola a chave quando pedir

wrangler secret put ANTHROPIC_API_KEY
wrangler secret put GOOGLE_API_KEY
wrangler secret put OPENROUTER_API_KEY
```

As chaves ficam criptografadas no Cloudflare e **não aparecem em lugar nenhum** do código ou do repositório.

### 1.5. Configurar o domínio permitido (CORS)

Abra `worker/index.js` e edite a lista `ALLOWED_ORIGINS` para conter **apenas** o seu domínio do GitHub Pages:

```javascript
const ALLOWED_ORIGINS = [
  'https://SEU-USUARIO.github.io',   // ← troque aqui
  'http://localhost:8000',            // opcional, para dev
];
```

Depois rode `wrangler deploy` de novo para aplicar.

---

## Parte 2 — Deploy do Frontend no GitHub Pages

### 2.1. Criar o repositório

```bash
# Na raiz do projeto (onde está o index.html):
git init
git add index.html style.css app.js rubrica.js README.md
git commit -m "Initial commit: Corretor ENEM"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/corretor-enem.git
git push -u origin main
```

> Não commite a pasta `worker/` junto se quiser mantê-la em repo separado — ou mantenha tudo no mesmo repo, o GitHub Pages vai ignorar a subpasta.

### 2.2. Ativar o GitHub Pages

1. Abra o repositório no GitHub
2. **Settings** → **Pages**
3. Source: **Deploy from a branch** → `main` → `/ (root)`
4. Salve e aguarde ~1 minuto

Seu site estará em: `https://SEU-USUARIO.github.io/corretor-enem/`

### 2.3. Configurar o endpoint no site

1. Abra o site
2. Clique em **⚙ Configurar** (canto superior direito)
3. Cole a URL do seu Cloudflare Worker (ex.: `https://corretor-enem-worker.seu-usuario.workers.dev`)
4. Salve

Pronto. A configuração fica salva no `localStorage` do navegador.

---

## Como usar

1. **Informe o tema proposto** (obrigatório — as LLMs precisam dele para avaliar fuga ao tema, Competência II).
2. **Cole ou faça upload da redação** (texto, `.txt` ou `.docx`).
3. (Opcional) **Nota de referência humana** — se você tem a nota real da banca, o sistema calcula o erro absoluto de cada LLM automaticamente.
4. **Selecione os modelos** que quer comparar.
5. **Disparar em paralelo** (mais rápido) ou sequencial.
6. **Temperatura 0** para comparação justa (recomendado).
7. Clique em **Corrigir redação**.

### Resultados

- **Cards resumo**: nota final 0–1000 de cada LLM, tempo de resposta e erro vs. referência humana.
- **Matriz de competências**: todas as LLMs lado a lado, com destaque visual de divergência (±80 ou mais).
- **Detalhes por LLM**: justificativa por competência + evidência textual extraída da redação.

---

## Rubrica Inep

O prompt enviado para todas as LLMs é o mesmo e contém:

- **5 competências** (C1–C5), cada uma com os 6 níveis oficiais (0, 40, 80, 120, 160, 200) e a descrição textual de cada nível, conforme cartilha do participante do Inep.
- **7 critérios de zeramento** (fuga ao tema, ≤7 linhas, desrespeito aos direitos humanos etc.).
- **Schema JSON rígido** de resposta, garantindo comparabilidade.

Para editar a rubrica, veja `rubrica.js` — tudo está num único objeto `RUBRICA_INEP` bem documentado.

---

## Custos estimados

- **GitHub Pages**: grátis
- **Cloudflare Workers**: plano grátis = 100.000 requisições/dia (mais que suficiente)
- **APIs das LLMs**: você paga apenas pelo uso real
  - Uma correção ≈ 2.500 tokens entrada + 800 tokens saída
  - GPT-4o ≈ US$ 0,02 por correção
  - Claude Sonnet 4.5 ≈ US$ 0,02 por correção
  - Gemini 1.5 Flash ≈ US$ 0,002 por correção
  - Llama 3.3 70B via OpenRouter ≈ US$ 0,003 por correção

Para uma aula com 30 alunos comparando 4 modelos: ~US$ 4 no total.

---

## Limitações e cautelas de pesquisa

- **Viés de severidade**: estudos recentes mostram que LLMs tendem a ser mais severas que humanos em competências de gramática (C1) e coesão (C4). Faça calibração com notas humanas reais antes de confiar.
- **Acordo com humanos**: QWK típico fica entre 0.5–0.7 em correção holística. Em correção analítica por competência, costuma cair.
- **Sensibilidade a prompt**: pequenas mudanças no prompt podem alterar notas. Mantenha `rubrica.js` versionado no git para reproducibilidade.
- **Não é correção oficial**: nunca substitua a banca humana do ENEM real.

---

## Protocolo sugerido para publicação acadêmica

Se for usar isso para um paper (SBIE, WEI, etc.):

1. Congelar a versão do `rubrica.js` e do `app.js` (git tag).
2. Rodar em um conjunto de N ≥ 100 redações previamente corrigidas por humanos.
3. Calcular por LLM: QWK, MAE por competência, viés médio (tendência de alta/baixa), taxa de divergência > 80 pontos.
4. Reportar: modelo + versão exata + data da chamada + temperatura + prompt versionado.
5. Discutir equidade: verificar se há viés sistemático por estilo de escrita ou tamanho do texto.

---

## Estrutura do projeto

```
corretor-enem/
├── index.html          # página principal
├── style.css           # estilos (editorial acadêmico)
├── app.js              # lógica do frontend
├── rubrica.js          # rubrica Inep + prompt builder
├── README.md           # este arquivo
└── worker/
    ├── index.js        # Cloudflare Worker (proxy seguro)
    └── wrangler.toml   # configuração do Wrangler
```

---

## Licença

MIT — uso livre para fins acadêmicos e educacionais.

---

**Prof. Ramon Mayor Martins** · IFSC Campus São José
Ferramenta de pesquisa em avaliação automatizada de redações.
