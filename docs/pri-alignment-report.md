# Relatório: Adequação do Atelier-Kit ao padrão Research → Plan → Implement

**Data:** 2026-07-05
**Método:** pesquisa profunda multi-fonte (5 ângulos de busca paralelos, ~15 fontes primárias, 190 claims extraídos) + análise do código do Atelier-Kit (branch `align-skills-with-manifesto`).
**Nota de confiança:** a verificação adversarial automatizada falhou por limite de sessão da API; em compensação, os claims centrais convergem entre fontes independentes e as duas fontes mais decisivas (ACE-FCA da HumanLayer e Claude Code Best Practices da Anthropic) foram verificadas manualmente contra o texto original — todos os pontos confirmados.

---

## 1. Sumário executivo

O padrão Research → Plan → Implement (RPI), nas suas formulações canônicas, produz **um artefato de research e um artefato de plano por tarefa** — não múltiplos trilhos paralelos. O consenso das fontes primárias (Anthropic, HumanLayer, Kiro, Spec-Kit) e dos relatos de praticantes é consistente:

1. **Research é um documento único, consolidado e compacto** (~50–300 linhas), focado em entendimento do codebase: arquivos relevantes, fluxo de informação, causas prováveis, restrições.
2. **Qualidade de research > quantidade de artefatos**: erros compõem upstream — uma linha ruim de research gera milhares de linhas ruins de código (ACE-FCA).
3. **Artefatos demais viram cerimônia**: Spec-Kit gerando 8 arquivos/1.300 linhas para feature trivial é o caso-limite citado como anti-padrão; a crítica da Thoughtworks (Böckeler) é que revisar muitos markdowns repetitivos é pior que revisar código.
4. **Cerimônia deve escalar com risco**: a própria Anthropic recomenda pular planejamento quando "o diff cabe numa frase".

O Atelier-Kit hoje produz 4/8/9+ artefatos por modo (quick/standard/deep), com 3 trilhos de research separados. A proposta deste relatório reduz para **2/3/4 artefatos** e **7 → 5 skills**, preservando os diferenciais reais do framework (estado explícito, gates determinísticos, review contra o plano, portabilidade entre hosts).

---

## 2. O padrão canônico

### 2.1 Anthropic — "Explore, Plan, Code, Commit" (verificado manualmente)

A doc oficial de best practices do Claude Code define o workflow em 4 fases (Explore → Plan → Implement → Commit) usando plan mode, e faz três afirmações diretamente relevantes:

- **Planejamento tem overhead e deve ser pulado para tarefas pequenas**: *"If you could describe the diff in one sentence, skip the plan."* Planejar vale quando a abordagem é incerta, a mudança toca vários arquivos ou o código é desconhecido.
- **Research via subagentes que retornam resumos consolidados** — a exploração não polui o contexto principal; o que chega é o resumo, não o artefato bruto.
- **Para features maiores: UM spec autocontido** (`SPEC.md` via entrevista), executado em sessão nova. O formato mínimo eficaz: nomeia arquivos e interfaces, declara o que está fora de escopo, termina com verificação end-to-end.

Times internos da Anthropic reforçam: o time de Security consolida múltiplas fontes de documentação em **um único markdown condensado** para alimentar o agente; o time de API usa o próprio agente como fase de research (identificar arquivos antes da tarefa); o time de RL tenta one-shot primeiro e só escala cerimônia se falhar.

### 2.2 HumanLayer — ACE-FCA (verificado manualmente)

A formulação mais influente do RPI puro. Confirmado no texto original:

- Três fases: **Research** (entender codebase e fluxo de informação) → **Plan** (passos exatos, arquivos a editar, verificação por fase) → **Implement** (executar fase a fase).
- **Um documento de research consolidado por tarefa**: subagentes condensam 10.000+ linhas de output bruto em ~300 linhas estruturadas. Barra de qualidade explícita: correto, completo, compacto (~50–200 linhas), com trajetória clara.
- **Erros compõem upstream**: *"a bad line of a plan could lead to hundreds of bad lines of code. And a bad line of research... could land you with thousands."* Por isso o esforço de revisão humana deve ir para research e plano, não só para o código.
- **O plano é um artefato vivo**: *"I'll often compact the current status back into the original plan file after each implementation phase is verified."* Não há cadeia de documentos novos.
- Utilização de contexto alvo: 40–60%.
- **As fases são flexíveis, não cerimoniais**: research pode ser pulado em tarefas simples; tarefas complexas podem exigir múltiplas passadas.
- Evidência de resultado: 35k LOC entregues em ~7h (3h research/plano, 4h implementação) num codebase Rust de 300k linhas.

---

## 3. Panorama comparativo de artefatos

| Framework | Fases | Artefatos de planejamento | Research |
|---|---|---|---|
| **ACE-FCA** (HumanLayer) | Research → Plan → Implement | **2** (research.md, plan.md) | 1 doc consolidado, ~50–300 linhas |
| **AWS Kiro** | Requirements → Design → Tasks | **3** (requirements.md, design.md, tasks.md) | Sem artefato de research; o design.md absorve arquitetura, fluxos e considerações técnicas |
| **GitHub Spec-Kit** | constitution → specify → clarify → plan → tasks → implement | **3 core** (spec.md, plan.md, tasks.md) + condicionais | research.md é *subproduto* do `/speckit.plan`, único por feature — não é fase própria |
| **OpenSpec** | proposal → apply → archive | **~2** (proposal.md, tasks.md + deltas) | Embutido na proposta |
| **Claude Code nativo** | Explore → Plan → Implement → Commit | **1** (plano do plan mode ou SPEC.md) | Subagentes → resumo em contexto |
| **BMAD Method** | multi-agente (21+ agentes) | 4+ (story, arch, dev, qa...) | Analyst dedicado (pesquisa de mercado/usuário, não de repo) |
| **Atelier-Kit hoje** | 7 fases | **4/8/9+** por modo | 3 trilhos separados (repo/tech/business) + synthesis |

Observações dos praticantes que calibram o ponto ótimo:

- **Custo da cerimônia**: workflows spec-driven completos custam 1–3+ horas por feature incluindo revisão; specs estáticos driftam da implementação em horas.
- **Caso-limite negativo**: Spec-Kit gerou 8 arquivos / ~1.300 linhas para exibir a data atual; Kiro aplicado a um bugfix pequeno gerou 4 user stories com 16 critérios de aceitação ("marreta para quebrar noz").
- **Risco de má-consumação**: no teste da Thoughtworks, o agente implementador leu o research do Spec-Kit como se fosse especificação nova e **duplicou classes existentes** — o formato do research importa tanto quanto o conteúdo (deve declarar explicitamente "isto existe" vs "isto será criado").
- **Volume não garante obediência**: mesmo com templates e checklists extensos, agentes frequentemente ignoram instruções — o que reforça a estratégia do Atelier de validar por gate determinístico, não por instrução.

---

## 4. Diagnóstico do Atelier-Kit à luz do padrão

O manifesto já contém os princípios certos (§6 orçamento de instrução, §13 "cerimônia proporcional ao risco", princípio 10 "sair da frente"). O desvio não é conceitual — é de **granularidade de artefatos**:

| Problema | Evidência no repo | Contraste com o padrão |
|---|---|---|
| 3 trilhos de research separados | `research/repo.md`, `tech.md`, `business.md` (modes.yaml, skills) | Todas as formulações canônicas usam 1 doc consolidado; ACE-FCA define research como *entendimento do codebase*, não trilhos temáticos |
| `synthesis.md` como artefato próprio | tarefa `synthesis` em `templates.ts` | Só existe porque há 3 trilhos a consolidar; com 1 doc de research, a síntese é redundante |
| `decisions.md` + `design.md` separados | designer escreve ambos | Kiro absorve decisões no design.md; formato ADR cabe como seção |
| `questions.md` como arquivo próprio | questioner | Spec-Kit trata clarificação como comando (`/speckit.clarify`), não artefato persistente; perguntas são insumo do research, não entregável paralelo |
| Modo deep exige 4 artefatos órfãos | `modes.yaml`: risk-register, rollback, test-strategy, critique — sem skill dona, bloqueados pelo phase gate do `core.md` | Nenhum framework pesquisado tem artefatos sem dono; risco/rollback aparecem como *seções* obrigatórias |
| Plano é estático após `planned` | export-plan gera mirror uma vez | ACE-FCA compacta progresso de volta no plan.md a cada fase verificada |
| Sem orçamento de tamanho para artefatos | gate só valida estrutura | ACE-FCA: 50–300 linhas é a barra de qualidade; compacidade é critério, não estilo |

Contagem atual: **quick = 4 arquivos, standard = 8, deep = 9 (+4 órfãos)**. Para efeito de comparação, o framework mais pesado em uso real (Spec-Kit completo) produz ~6 e é criticado por isso.

---

## 5. Proposta de adequação

### 5.1 Novo conjunto de artefatos

```
.atelier/epics/<epic>/
├── state.json          (ledger — inalterado)
├── research.md         (consolidado: perguntas + repo + tech + business em seções)
├── design.md           (só standard/deep; decisões ADR embutidas)
├── plan.md             (contrato de implementação — vivo)
└── review.md           (comparação promessa × entrega)
```

**`research.md`** — um documento, seções fixas, com orçamento de tamanho (alvo 50–300 linhas):

```markdown
# Research: <epic>
## Questions            ← escrito primeiro (preserva o §7 do manifesto: perguntas antes de evidência)
## Codebase             ← arquivos, símbolos, fluxo de informação, padrões a seguir (ex-repo.md)
## Constraints          ← dependências, versões, APIs externas, segurança (ex-tech.md)
## Product behavior     ← happy/error paths, critérios candidatos (ex-business.md; obrigatório só em deep)
## What exists vs what will be created   ← previne a má-consumação observada no Spec-Kit
## Open unknowns
```

**`design.md`** absorve `decisions.md` (seção `## Decisions` em formato ADR compacto) e, **em modo deep, absorve os artefatos órfãos** como seções obrigatórias: `## Risk register`, `## Rollback`, `## Test strategy`. O gate valida presença das seções por modo — resolve a inconsistência atual sem criar arquivos novos.

**`plan.md`** inalterado na estrutura (Goal/Assumptions/Risks/Slices com allowed_files), mas ganha o comportamento de **artefato vivo** do ACE-FCA: a fase de implementação nativa registra progresso por slice de volta no plano (seção `## Progress` ou checkbox por slice), e o mirror é re-exportado. A seção `## Evidence Summary` que o planner já escreve substitui o `synthesis.md`.

### 5.2 Contagem por modo

| Modo | Hoje | Proposto | Artefatos |
|---|---|---|---|
| quick | 4 | **2** | plan.md (com research inline numa seção `## Research notes`), review.md |
| standard | 8 | **3** | research.md, plan.md, review.md — design vira seção do plano ou artefato opcional |
| deep | 9+4 órfãos | **4** | research.md, design.md (com risk/rollback/test-strategy), plan.md, review.md |

Isso alinha quick com a recomendação da Anthropic (pular cerimônia quando o escopo é claro), standard com ACE-FCA/Kiro (2–3 artefatos), e deep com a justificativa original do manifesto sem os órfãos.

### 5.3 Skills: 7 → 5

| Skill | Destino |
|---|---|
| questioner | **Mantida** — escreve a seção `## Questions` de research.md (preserva o filtro de qualidade do §7 sem arquivo próprio) |
| repo-analyst, tech-analyst, business-analyst | **Fundidas em `researcher`** — uma skill, um artefato, seções por trilho. Os "Forbidden Actions" e a disciplina de evidência das três skills atuais migram intactos. A pesquisa dá suporte direto: subagentes genéricos performam quase tão bem quanto especializados (ACE-FCA), e a especialização por *seção* mantém o foco sem multiplicar artefatos |
| designer | Mantida (standard/deep) — passa a escrever decisões dentro do design.md |
| planner | Mantida — perde a responsabilidade de synthesis.md (resolve também a mistura de papéis do §8 do manifesto apontada na avaliação anterior) |
| reviewer | Mantida — com a comparação diff × allowed_files (pendência da avaliação anterior, e o diferencial competitivo mais forte do framework) |

O phase gate do `core.md` simplifica: `questioner` e `researcher` escrevem `research.md` (seções diferentes), `designer` → `design.md`, `planner` → `plan.md`, `reviewer` → `review.md`.

### 5.4 Novos gates (baratos, alavancados)

- **`research-ready`**: research.md tem as seções exigidas pelo modo, cita paths/símbolos concretos (o validador já tem o padrão `questionsLookGenericOnly` como precedente), e respeita o orçamento de tamanho (~300 linhas, warning acima). Espelha o `instruction-budget` que já existe para skills.
- **`plan-ready`** ganha a checagem de `allowed_files` por slice (hoje o campo existe no schema mas nada o valida).
- **`review`** ganha a comparação automática de arquivos alterados × allowed_files no `cmdReview` (`src/commands/review.ts` já coleta o diff; falta cruzar).

### 5.5 Impacto no repositório

| Área | Mudança |
|---|---|
| `kit/skills/` | criar `researcher.md` (fusão); remover os 3 analysts; ajustar questioner/designer/planner |
| `kit/protocol/modes.yaml` | novas listas de artefatos por modo; remover órfãos |
| `kit/protocol/workflow.yaml`, `skills.yaml` | estados discovery→research; mapa skill→artefato |
| `kit/rules/core.md` | tabela do phase gate reduzida; ordem `questioner → researcher → [designer] → planner → reviewer` |
| `src/protocol/templates.ts` | `tasksForMode` com 2/3/4 tasks; stubs com seções |
| `src/protocol/validator.ts` | gate research-ready; allowed_files no plan-ready; seções por modo |
| `src/protocol/schema.ts` | task types `research` (substitui questions/repo/tech/business/synthesis) |
| `src/commands/review.ts` | cruzamento diff × allowed_files |
| Manifesto §7/§8, PROTOCOL.md, README | atualizar fluxo e contagens |

Migração: epics existentes com layout antigo continuam válidos (o ledger aponta os artefatos); `atelier doctor` pode oferecer conversão.

---

## 6. O que NÃO mudar

A pesquisa também valida o que o Atelier já faz melhor que o padrão de mercado — cortar aqui seria destruir o diferencial:

1. **Estado explícito + phase gate** — nenhum framework pesquisado tem equivalente; é a resposta correta ao achado de que "agentes frequentemente ignoram instruções".
2. **Gates determinísticos via CLI** — specs driftam e agentes desobedecem; validação por código é a única defesa real.
3. **Review pós-implementação contra o plano** — Spec-Kit, Kiro e OpenSpec param no plano. Com allowed_files implementado, é o recurso que nenhum concorrente oferece.
4. **Perguntas antes de research (§7)** — o `/speckit.clarify` do Spec-Kit confirma o valor da etapa; a mudança é só onde o output mora.
5. **Portabilidade via adapters** — a aposta contra a captura pelos plan modes nativos.

---

## 7. Fontes principais

- Anthropic — Claude Code Best Practices (code.claude.com/docs/en/best-practices) — **verificada manualmente**
- HumanLayer — Advanced Context Engineering for Coding Agents / ACE-FCA (github.com/humanlayer/advanced-context-engineering-for-coding-agents) — **verificada manualmente**
- Anthropic — "How Anthropic teams use Claude Code" (PDF interno publicado)
- GitHub Spec-Kit (github/spec-kit — docs e templates)
- AWS Kiro — documentação de specs (kiro.dev)
- OpenSpec (openspec docs)
- Birgitta Böckeler (Thoughtworks) — teste hands-on de Spec-Kit/Kiro/BMAD
- Comparativos de praticantes 2025–2026 sobre custo de cerimônia em spec-driven development

*Claims não citados individualmente estão em convergência ≥2 fontes independentes; a verificação adversarial automatizada não pôde rodar (limite de sessão) e os claims de fontes únicas secundárias foram tratados como ilustrativos, não estruturais.*
