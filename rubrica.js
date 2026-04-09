/* ============================================
   RUBRICA OFICIAL — 5 COMPETÊNCIAS DO INEP
   Baseada na Cartilha do Participante do ENEM
   ============================================ */

const RUBRICA_INEP = {
  competencias: [
    {
      id: 1,
      nome: "Competência I",
      titulo: "Domínio da norma padrão da língua escrita",
      descricao: "Demonstrar domínio da modalidade escrita formal da língua portuguesa.",
      niveis: {
        0:   "Demonstra desconhecimento da modalidade escrita formal da língua portuguesa.",
        40:  "Demonstra domínio precário da modalidade escrita formal, com muitos desvios gramaticais, de escolha de registro e de convenções da escrita.",
        80:  "Demonstra domínio insuficiente da modalidade escrita formal, com muitos desvios gramaticais, de escolha de registro e de convenções da escrita.",
        120: "Demonstra domínio mediano da modalidade escrita formal, com alguns desvios gramaticais e de convenções da escrita.",
        160: "Demonstra bom domínio da modalidade escrita formal, com poucos desvios gramaticais e de convenções da escrita.",
        200: "Demonstra excelente domínio da modalidade escrita formal, com raros desvios gramaticais e de convenções da escrita."
      }
    },
    {
      id: 2,
      nome: "Competência II",
      titulo: "Compreensão do tema e aplicação do texto dissertativo-argumentativo",
      descricao: "Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa.",
      niveis: {
        0:   "Fuga ao tema / não atendimento à estrutura dissertativo-argumentativa.",
        40:  "Apresenta o assunto, tangenciando o tema, ou apresenta domínio precário do texto dissertativo-argumentativo, com traços constantes de outros tipos textuais.",
        80:  "Desenvolve o tema recorrendo à cópia de trechos dos textos motivadores ou apresenta domínio insuficiente do texto dissertativo-argumentativo, não atendendo à estrutura com proposição, argumentação e conclusão.",
        120: "Desenvolve o tema por meio de argumentação previsível e apresenta domínio mediano do texto dissertativo-argumentativo, com proposição, argumentação e conclusão.",
        160: "Desenvolve o tema por meio de argumentação consistente e apresenta bom domínio do texto dissertativo-argumentativo, com proposição, argumentação e conclusão.",
        200: "Desenvolve o tema por meio de argumentação consistente, a partir de um repertório sociocultural produtivo, e apresenta excelente domínio do texto dissertativo-argumentativo."
      }
    },
    {
      id: 3,
      nome: "Competência III",
      titulo: "Seleção, relação, organização e interpretação de informações",
      descricao: "Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista.",
      niveis: {
        0:   "Apresenta informações, fatos e opiniões não relacionados ao tema e sem defesa de um ponto de vista.",
        40:  "Apresenta informações, fatos e opiniões relacionados ao tema, mas desorganizados ou contraditórios e limitados aos argumentos dos textos motivadores, em defesa de um ponto de vista.",
        80:  "Apresenta informações, fatos e opiniões relacionados ao tema, limitados aos argumentos dos textos motivadores e pouco organizados, em defesa de um ponto de vista.",
        120: "Apresenta informações, fatos e opiniões relacionados ao tema, limitados aos argumentos dos textos motivadores e pouco organizados, em defesa de um ponto de vista.",
        160: "Apresenta informações, fatos e opiniões relacionados ao tema, de forma organizada, com indícios de autoria, em defesa de um ponto de vista.",
        200: "Apresenta informações, fatos e opiniões relacionados ao tema proposto, de forma consistente e organizada, configurando autoria, em defesa de um ponto de vista."
      }
    },
    {
      id: 4,
      nome: "Competência IV",
      titulo: "Conhecimento dos mecanismos linguísticos de argumentação",
      descricao: "Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.",
      niveis: {
        0:   "Não articula as informações.",
        40:  "Articula as partes do texto de forma precária.",
        80:  "Articula as partes do texto, de forma insuficiente, com muitas inadequações e apresenta repertório limitado de recursos coesivos.",
        120: "Articula as partes do texto, de forma mediana, com inadequações, e apresenta repertório pouco diversificado de recursos coesivos.",
        160: "Articula as partes do texto com poucas inadequações e apresenta repertório diversificado de recursos coesivos.",
        200: "Articula bem as partes do texto e apresenta repertório diversificado de recursos coesivos."
      }
    },
    {
      id: 5,
      nome: "Competência V",
      titulo: "Proposta de intervenção com respeito aos direitos humanos",
      descricao: "Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.",
      niveis: {
        0:   "Não apresenta proposta de intervenção ou apresenta proposta não relacionada ao tema ou ao assunto, ou desrespeita os direitos humanos.",
        40:  "Apresenta proposta de intervenção vaga, precária ou relacionada apenas ao assunto.",
        80:  "Apresenta proposta de intervenção relacionada ao tema, mas não articulada com a discussão desenvolvida no texto.",
        120: "Apresenta proposta de intervenção relacionada ao tema, mas pouco articulada à discussão desenvolvida no texto.",
        160: "Apresenta proposta de intervenção relacionada ao tema e articulada à discussão desenvolvida no texto.",
        200: "Apresenta proposta de intervenção detalhada, relacionada ao tema e articulada à discussão desenvolvida no texto, contemplando os cinco elementos: agente, ação, modo/meio, efeito e detalhamento."
      }
    }
  ],

  zeramento: [
    "Fuga total ao tema",
    "Não atendimento ao tipo textual dissertativo-argumentativo",
    "Texto com até 7 linhas (insuficiente)",
    "Cópia integral dos textos motivadores",
    "Texto em branco ou anulado",
    "Desrespeito aos direitos humanos",
    "Parte deliberadamente desconectada do tema"
  ]
};

/* ============================================
   buildPrompt — constrói o prompt enviado às LLMs
   ============================================ */

function buildPrompt(tema, redacao) {
  const compsText = RUBRICA_INEP.competencias.map(c => {
    const niveis = Object.entries(c.niveis)
      .map(([nota, desc]) => `  • ${nota}: ${desc}`)
      .join("\n");
    return `${c.nome} — ${c.titulo}\n${c.descricao}\nNíveis possíveis (nota: descrição):\n${niveis}`;
  }).join("\n\n");

  const zeramentoText = RUBRICA_INEP.zeramento.map(z => `  - ${z}`).join("\n");

  return `Você é um avaliador de redações do ENEM treinado nas 5 competências do Inep.
Avalie a redação abaixo seguindo ESTRITAMENTE a rubrica oficial.

═══════════════════════════════════════
RUBRICA OFICIAL — 5 COMPETÊNCIAS DO INEP
═══════════════════════════════════════

${compsText}

═══════════════════════════════════════
SITUAÇÕES DE NOTA ZERO (aplicar se identificado)
═══════════════════════════════════════
${zeramentoText}

═══════════════════════════════════════
TEMA PROPOSTO
═══════════════════════════════════════
${tema}

═══════════════════════════════════════
REDAÇÃO A SER AVALIADA
═══════════════════════════════════════
${redacao}

═══════════════════════════════════════
TAREFA
═══════════════════════════════════════
Avalie cada uma das 5 competências atribuindo uma nota DENTRE os valores permitidos: 0, 40, 80, 120, 160, 200.
Para cada competência, forneça:
- "nota": valor inteiro (0, 40, 80, 120, 160 ou 200)
- "justificativa": 1-2 frases objetivas explicando o nível atribuído
- "evidencia": uma citação CURTA (até 15 palavras) do texto que fundamenta a nota, ou null se não aplicável
- "confianca": "alta", "media" ou "baixa"

IMPORTANTE: Responda APENAS com um objeto JSON válido, começando com { e terminando com }. NÃO inclua markdown, NÃO use blocos de código com crase, NÃO adicione texto antes ou depois do JSON. O primeiro caractere da sua resposta deve ser { e o último deve ser }.

Schema esperado:
{
  "competencias": {
    "c1": {"nota": 0-200, "justificativa": "...", "evidencia": "...", "confianca": "..."},
    "c2": {"nota": 0-200, "justificativa": "...", "evidencia": "...", "confianca": "..."},
    "c3": {"nota": 0-200, "justificativa": "...", "evidencia": "...", "confianca": "..."},
    "c4": {"nota": 0-200, "justificativa": "...", "evidencia": "...", "confianca": "..."},
    "c5": {"nota": 0-200, "justificativa": "...", "evidencia": "...", "confianca": "..."}
  },
  "nota_final": 0-1000,
  "zeramento": null,
  "observacao_geral": "Comentário global de 1-2 frases."
}

Se identificar situação de zeramento, preencha "zeramento" com o motivo e atribua 0 em todas as competências afetadas.
Seja consistente com a rubrica. Responda APENAS o JSON.`;
}
