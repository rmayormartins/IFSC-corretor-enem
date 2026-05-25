/* ============================================
   RUBRICA OFICIAL — 5 COMPETÊNCIAS DO INEP
   Versão refinada com foco especial na C1
   ============================================ */

const RUBRICA_INEP = {
  competencias: [
    {
      id: 1,
      nome: "Competência I",
      titulo: "Domínio da modalidade escrita formal da língua portuguesa",
      descricao:
        "Demonstrar domínio da modalidade escrita formal da língua portuguesa.",
      niveis: {
        0: "Demonstra desconhecimento da modalidade escrita formal da língua portuguesa.",
        40: "Demonstra domínio precário da modalidade escrita formal da língua portuguesa, de forma sistemática, com diversificados e frequentes desvios gramaticais, de escolha de registro e de convenções da escrita.",
        80: "Demonstra domínio insuficiente da modalidade escrita formal da língua portuguesa, com muitos desvios gramaticais, de escolha de registro e de convenções da escrita.",
        120: "Demonstra domínio mediano da modalidade escrita formal da língua portuguesa, com alguns desvios gramaticais e de convenções da escrita.",
        160: "Demonstra bom domínio da modalidade escrita formal da língua portuguesa, com poucos desvios gramaticais e de convenções da escrita.",
        200: "Demonstra excelente domínio da modalidade escrita formal da língua portuguesa, com, no máximo, uma falha de estrutura sintática e, no máximo, dois desvios gramaticais ou de convenções da escrita."
      },

      // Guia técnico-portável para orientar a LLM
      guiaAvaliacao: {
        eixos: [
          "Estrutura sintática",
          "Desvios gramaticais e de convenções da escrita"
        ],

        estrutura_sintatica: {
          inexistente:
            "Não há organização frasal minimamente inteligível. Há apenas palavras e/ou grupos isolados sem sintaxe funcional. Se há palavras legíveis, mas sem sintaxe reconhecível, a C1 pode ser 0.",
          deficitaria:
            "A fluidez da leitura está comprometida. Há truncamentos, justaposições frequentes, ausência de palavras essenciais ou organização frasal muito precária.",
          regular:
            "Há falhas de estrutura sintática, mas a leitura flui. Podem ocorrer truncamentos pontuais, justaposições indevidas, predominância de parágrafos de período único ou pouca complexidade estrutural.",
          boa:
            "Há boa organização sintática, com falhas pontuais que não comprometem a fluidez global.",
          excelente:
            "Períodos completos, bem organizados, com complexidade sintática adequada. Admite, no máximo, uma falha de estrutura sintática."
        },

        desvios: {
          muitos:
            "Desvios frequentes e/ou diversificados de grafia, acentuação, concordância, regência, pontuação, translineação, paralelismo, crase, pronomes, maiúsculas/minúsculas etc. A avaliação deve considerar o conjunto textual, não apenas a contagem bruta.",
          alguns:
            "Desvios perceptíveis, mas não excessivos no conjunto textual.",
          poucos:
            "Poucos desvios, pontuais e não recorrentes.",
          maximo_dois:
            "No máximo dois desvios em todo o texto."
        },

        regras_decisao: [
          "A C1 deve ser avaliada em dois eixos independentes: estrutura sintática e desvios.",
          "Se a redação apresentar características de dois níveis diferentes, deve-se atribuir o nível inferior.",
          "A quantidade de desvios, sozinha, não define o nível da estrutura sintática.",
          "O conjunto textual importa: em textos curtos ou pouco expressivos, poucos erros absolutos podem equivaler a 'muitos' desvios proporcionalmente.",
          "Texto ilegível gera anulação da redação; porém, se há palavras ou frases isoladas legíveis, a redação pode ser corrigida normalmente e receber C1 = 0 se a estrutura sintática for inexistente.",
          "Repetição da mesma falha estrutural ou do mesmo desvio na mesma construção deve ser penalizada com cautela, evitando supercontagem indevida."
        ],

        matriz_niveis: {
          0: "Estrutura sintática inexistente, independentemente da quantidade de desvios, desde que o texto não seja ilegível a ponto de ser anulado.",
          40: "Estrutura sintática deficitária + muitos desvios.",
          80: "Estrutura sintática deficitária + alguns desvios; OU estrutura sintática regular + muitos desvios.",
          120: "Estrutura sintática regular + alguns desvios; OU estrutura sintática regular + poucos desvios; OU estrutura sintática boa + alguns desvios.",
          160: "Estrutura sintática boa + poucos desvios; OU estrutura sintática excelente + poucos desvios.",
          200: "Estrutura sintática excelente (no máximo uma falha) + no máximo dois desvios."
        }
      }
    },

    {
      id: 2,
      nome: "Competência II",
      titulo: "Compreensão do tema e aplicação do texto dissertativo-argumentativo",
      descricao:
        "Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa.",
      niveis: {
        0: "Fuga ao tema / não atendimento à estrutura dissertativo-argumentativa.",
        40: "Tangencia o tema ou apresenta domínio precário do texto dissertativo-argumentativo, com traços constantes de outros tipos textuais.",
        80: "Desenvolve o tema de modo insuficiente ou apresenta domínio insuficiente do texto dissertativo-argumentativo.",
        120: "Desenvolve o tema por meio de argumentação previsível e apresenta domínio mediano do texto dissertativo-argumentativo.",
        160: "Desenvolve o tema por meio de argumentação consistente e apresenta bom domínio do texto dissertativo-argumentativo.",
        200: "Desenvolve o tema por meio de argumentação consistente, a partir de repertório sociocultural produtivo, e apresenta excelente domínio do texto dissertativo-argumentativo."
      }
    },

    {
      id: 3,
      nome: "Competência III",
      titulo: "Seleção, relação, organização e interpretação de informações",
      descricao:
        "Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista.",
      niveis: {
        0: "Apresenta informações, fatos e opiniões não relacionados ao tema e sem defesa de um ponto de vista.",
        40: "Apresenta informações, fatos e opiniões pouco relacionados ao tema ou muito desorganizados, em defesa precária de um ponto de vista.",
        80: "Apresenta informações, fatos e opiniões relacionados ao tema, mas pouco organizados e limitados, em defesa de um ponto de vista.",
        120: "Apresenta informações, fatos e opiniões relacionados ao tema, com organização mediana, em defesa de um ponto de vista.",
        160: "Apresenta informações, fatos e opiniões relacionados ao tema, de forma organizada, com indícios de autoria, em defesa de um ponto de vista.",
        200: "Apresenta informações, fatos e opiniões relacionados ao tema proposto, de forma consistente e organizada, configurando autoria, em defesa de um ponto de vista."
      }
    },

    {
      id: 4,
      nome: "Competência IV",
      titulo: "Conhecimento dos mecanismos linguísticos de argumentação",
      descricao:
        "Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.",
      niveis: {
        0: "Não articula as informações.",
        40: "Articula as partes do texto de forma precária.",
        80: "Articula as partes do texto de forma insuficiente, com muitas inadequações e repertório limitado de recursos coesivos.",
        120: "Articula as partes do texto de forma mediana, com inadequações, e repertório pouco diversificado de recursos coesivos.",
        160: "Articula as partes do texto com poucas inadequações e repertório diversificado de recursos coesivos.",
        200: "Articula bem as partes do texto e apresenta repertório diversificado de recursos coesivos."
      }
    },

    {
      id: 5,
      nome: "Competência V",
      titulo: "Proposta de intervenção com respeito aos direitos humanos",
      descricao:
        "Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.",
      niveis: {
        0: "Não apresenta proposta de intervenção, ou apresenta proposta não relacionada ao tema/assunto, ou desrespeita os direitos humanos.",
        40: "Apresenta proposta de intervenção vaga, precária ou relacionada apenas ao assunto.",
        80: "Apresenta proposta de intervenção relacionada ao tema, mas não articulada com a discussão desenvolvida no texto.",
        120: "Apresenta proposta de intervenção relacionada ao tema, mas pouco articulada à discussão desenvolvida no texto.",
        160: "Apresenta proposta de intervenção relacionada ao tema e articulada à discussão desenvolvida no texto.",
        200: "Apresenta proposta de intervenção detalhada, relacionada ao tema e articulada à discussão desenvolvida no texto, contemplando agente, ação, modo/meio, efeito e detalhamento."
      }
    }
  ],

  zeramento: [
    "Fuga total ao tema",
    "Não atendimento ao tipo textual dissertativo-argumentativo",
    "Texto com até 7 linhas",
    "Cópia integral ou predominante dos textos motivadores",
    "Texto em branco",
    "Texto ilegível",
    "Desrespeito aos direitos humanos",
    "Parte deliberadamente desconectada do tema"
  ]
};

/* ============================================
   buildPrompt — constrói o prompt enviado às LLMs
   ============================================ */

function buildPrompt(tema, redacao) {
  const compsText = RUBRICA_INEP.competencias
    .map((c) => {
      const niveis = Object.entries(c.niveis)
        .map(([nota, desc]) => `  • ${nota}: ${desc}`)
        .join("\n");

      let extras = "";

      if (c.id === 1 && c.guiaAvaliacao) {
        const gs = c.guiaAvaliacao.estrutura_sintatica;
        const dv = c.guiaAvaliacao.desvios;

        extras = `
REGRAS ESPECÍFICAS DA COMPETÊNCIA I:
- Avalie a C1 em DOIS EIXOS independentes: (a) estrutura sintática e (b) desvios.
- Estrutura sintática:
  • inexistente: ${gs.inexistente}
  • deficitária: ${gs.deficitaria}
  • regular: ${gs.regular}
  • boa: ${gs.boa}
  • excelente: ${gs.excelente}
- Desvios:
  • muitos: ${dv.muitos}
  • alguns: ${dv.alguns}
  • poucos: ${dv.poucos}
  • no máximo dois: ${dv.maximo_dois}
- Regra decisória obrigatória:
  • Se houver traços de dois níveis, atribua o NÍVEL INFERIOR.
- Matriz de enquadramento da C1:
  • 0: ${c.guiaAvaliacao.matriz_niveis[0]}
  • 40: ${c.guiaAvaliacao.matriz_niveis[40]}
  • 80: ${c.guiaAvaliacao.matriz_niveis[80]}
  • 120: ${c.guiaAvaliacao.matriz_niveis[120]}
  • 160: ${c.guiaAvaliacao.matriz_niveis[160]}
  • 200: ${c.guiaAvaliacao.matriz_niveis[200]}
- Atenções obrigatórias:
  • Não confunda "texto ilegível" (anulação) com "C1 = 0 por estrutura sintática inexistente".
  • Não use mera contagem bruta de erros: considere o conjunto textual.
  • A quantidade de desvios não define sozinha a qualidade da estrutura sintática.`;
      }

      return `${c.nome} — ${c.titulo}
${c.descricao}
Níveis possíveis (nota: descrição):
${niveis}${extras}`;
    })
    .join("\n\n");

  const zeramentoText = RUBRICA_INEP.zeramento.map((z) => `  - ${z}`).join("\n");

  return `Você é um avaliador especialista em correção de redações do ENEM, com atuação alinhada aos critérios oficiais do INEP.
Avalie a redação abaixo seguindo ESTRITAMENTE a rubrica oficial.

═══════════════════════════════════════
RUBRICA OFICIAL — 5 COMPETÊNCIAS DO INEP
═══════════════════════════════════════

${compsText}

═══════════════════════════════════════
SITUAÇÕES DE NOTA ZERO
═══════════════════════════════════════
${zeramentoText}

REGRAS GERAIS OBRIGATÓRIAS:
- Avalie cada competência separadamente.
- Não arraste automaticamente a nota de uma competência para outra.
- Evite dupla penalização do mesmo problema em competências diferentes.
- Use somente as notas permitidas: 0, 40, 80, 120, 160, 200.
- Seja técnico, objetivo e fiel ao padrão do ENEM.
- Na C1, aplique obrigatoriamente a lógica de estrutura sintática + desvios.
- Quando houver mistura de características de dois níveis na mesma competência, atribua o nível inferior.

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
Avalie cada uma das 5 competências atribuindo uma nota dentre os valores permitidos: 0, 40, 80, 120, 160, 200.

Para cada competência, forneça:
- "nota": valor inteiro
- "justificativa": 2 a 4 frases técnicas e objetivas
- "evidencia": uma citação curta do texto (até 20 palavras) que fundamente a análise, ou null se não aplicável
- "confianca": "alta", "media" ou "baixa"

Na Competência I, além da justificativa normal, sua análise DEVE considerar explicitamente:
- o nível da estrutura sintática
- a quantidade de desvios
- a regra do nível inferior

IMPORTANTE:
- Responda APENAS com um objeto JSON válido.
- Não use markdown.
- Não use blocos de código.
- Não escreva texto antes nem depois do JSON.
- O primeiro caractere deve ser { e o último deve ser }.

Schema esperado:
{
  "competencias": {
    "c1": {
      "nota": 0,
      "justificativa": "",
      "evidencia": null,
      "confianca": "alta"
    },
    "c2": {
      "nota": 0,
      "justificativa": "",
      "evidencia": null,
      "confianca": "alta"
    },
    "c3": {
      "nota": 0,
      "justificativa": "",
      "evidencia": null,
      "confianca": "alta"
    },
    "c4": {
      "nota": 0,
      "justificativa": "",
      "evidencia": null,
      "confianca": "alta"
    },
    "c5": {
      "nota": 0,
      "justificativa": "",
      "evidencia": null,
      "confianca": "alta"
    }
  },
  "nota_final": 0,
  "zeramento": null,
  "observacao_geral": ""
}

Se houver nota zero, preencha "zeramento" com o motivo específico.
Se não houver zeramento, use "zeramento": null.
A nota final deve ser a soma das cinco competências.`;
}

/* ============================================
   Export opcional para ambientes modulares
   ============================================ */

if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUBRICA_INEP, buildPrompt };
}
