# Plano de refactor completo do atelier-kit

> Artefato de planejamento, não parte do produto. Versionado em `dev/` para
> servir de fonte das próximas mudanças. Será excluído do pacote npm na Fase 7.

## Contexto

A avaliação anterior concluiu que o atelier-kit tem uma ideia central forte
(planejamento explícito + plano como contrato + estado no repo) embrulhada em
camadas de cerimônia: manifesto de 694 linhas, 6 docs que repetem ativação,
13 comandos de CLI (vários "opcionais"), 2 caminhos de ativação paralelos,
11 adapters como módulos TS separados e 8 skills com estrutura quase idêntica.

Diretivas escolhidas pelo usuário:
1. **"Menos features, melhor executadas"** — alavancagem, não superfície.
2. **Quebrar compatibilidade é aceitável** — versão jovem.
3. O objetivo é tornar o framework **simples E poderoso**: o "poder" mora em
   transformar `review` e `plan-ready` em verificações executáveis, não em
   adicionar mais comandos.

Este plano traduz a avaliação em ações concretas. Cada fase é entregável
isolado, pode ser revertida sozinha e tem critério de aceitação claro.

---

## Pilares-alvo (o "norte" pós-refactor)

1. **Planejar ≠ implementar.** Atelier cobre só o planejar.
2. **Plano é contrato verificável.** `plan.md` com slices verificáveis por
   código, não só por prosa.
3. **Estado vive no repo.** Um `.atelier/` versionável e sem fluxo paralelo.
4. **Opt-in.** Inativo por padrão; ativa por **um** comando explícito.

A regra de teste para qualquer arquivo/comando/skill que sobrar: "ele serve um
desses 4 pilares?". Se não, sai.

---

## Surface-alvo

| Hoje | Depois |
|---|---|
| 6 docs (manifesto 694 + README + PROTOCOL + ARCHITECTURE + AGENT-USAGE + METHOD) | 3 docs: `README.md`, `MANIFESTO.md` (~150 linhas), `kit/rules/core.md` |
| 13 comandos de CLI | 7 comandos: `init`, `new`, `status`, `validate`, `export-plan`, `review`, `off` |
| 2 fluxos de ativação (`/atelier ...` + `host-plan`/`native-plan` hooks) | 1 fluxo: `/atelier ...` (chat) ou `atelier new` (CLI) |
| 11 módulos TS de adapter + 11 markdowns | 1 registry de dados + 1 renderer + 11 entradas |
| 8 skills | 3 skills: `researcher`, `designer`, `planner` (com modo `review`) |
| `review` que escreve prosa | `review` que executa verificações reais contra a diff |
| `plan-ready` que checa shape | `plan-ready` que rejeita planos fracos (allowed_files vagos, critérios não observáveis) |
| `kit/protocol/*.yaml` decorativos | Removidos (schemas Zod são a fonte) |
| `.picklejar/` + hooks misturados com produto | Movido para `dev/` ou `tools/`, fora do pacote npm |

---

## Fases (executar em ordem; cada uma é um PR independente)

### Fase 1 — Poda de documentação

**Risco**: baixo. **Impacto**: usuário lê 80% menos para entender o framework.

**Ações**:
- Reescrever `atelier-kit-manifesto.md` → renomear para `MANIFESTO.md`,
  encolher para ~150–200 linhas, estrutura:
  - Problema (1 parágrafo)
  - O que é (1 parágrafo)
  - 4 pilares
  - Um diagrama Mermaid (o full cycle, `atelier-kit-manifesto.md:530-550`)
  - "O que não é" (3 linhas)
  - Links para `PROTOCOL.md` e `CONTRIBUTING.md`
  - Cortar: §17 (re-manifesto), §19 (negações longas), §20–21 (statement),
    4 dos 5 mermaid diagrams, apêndice "summary view".
- Deletar `AGENT-USAGE.md` (conteúdo absorvido em `kit/rules/core.md` + README).
- Encolher `PROTOCOL.md` removendo descrição duplicada de comandos (linkar pro
  README) e remover seção "Native plan mirrors" duplicada da do README.
- `ARCHITECTURE.md` vira a **única** fonte do modelo de estado + camadas;
  outras docs referenciam.
- `kit/METHOD.md` deletado (sobrepõe `kit/rules/core.md`).
- `kit/rules/core.md` permanece como a fonte de verdade que o agente lê (não
  duplicar regras em README).

**Arquivos críticos**:
- `atelier-kit-manifesto.md` (reescrever e renomear)
- `AGENT-USAGE.md` (deletar)
- `PROTOCOL.md` (encolher)
- `ARCHITECTURE.md` (consolidar como referência técnica)
- `kit/METHOD.md` (deletar)
- `README.md` (limpar links pros docs deletados; **não** mexer nas tabelas de
  comando ainda — isso é Fase 2)

**Aceite**: cada conceito (ativação, gate `plan-ready`, árvore `.atelier/`,
ordem de planning, lista de comandos) aparece em **um** lugar canônico, com
links a partir dos outros.

---

### Fase 2 — Poda de CLI e unificação de ativação

**Risco**: médio (breaking). **Impacto**: superfície mental cai pela metade.

**Comandos a remover** (de `src/cli.ts` e `src/commands/`):
- `next` → cortar. Agente atualiza `state.json` direto.
  - Remover de `src/cli.ts:100-105`, deletar export `cmdNext` de
    `src/commands/lifecycle.ts`.
- `done` → cortar. Mesma razão; o agente é quem move o status.
  - Remover de `src/cli.ts:107-112`, deletar `cmdDone` de
    `src/commands/lifecycle.ts`.
- `host-plan start|finalize` e todo o grupo → cortar.
  - Remover `src/cli.ts:121-137`, deletar `src/commands/host-plan.ts`,
    `src/commands/host-plan-nudge.ts`.
- `native-plan claude-*-hook` e todo o grupo → cortar.
  - Remover `src/cli.ts:139-162`, deletar `src/commands/native-plan.ts`.
- Alias `adapter install <name>` → cortar.
  - Remover `src/cli.ts:171-178` (mantém só `install-adapter`).
- `render-rules` → fundir em `install-adapter --stdout`.
  - O que `render-rules` faz é só printar/escrever o conteúdo. Mover a flag
    `--stdout` para `install-adapter` e deletar `src/commands/rules.ts`.
- `doctor` → fundir em `validate --verbose`.
  - Mover checagens de `doctorProtocol` (`src/protocol/validator.ts:265-319`)
    para um modo verbose de `validateProtocol`. Deletar
    `src/commands/doctor.ts`.

**Comandos finais** (atualizar `src/cli.ts` para refletir):
```
atelier init
atelier new "<title>" [--mode quick|standard|deep] [--goal "..."]
atelier status
atelier validate [--gate plan-ready] [--verbose]
atelier export-plan [--adapter <name>] [--path ...] [--command ...] [--if-planned] [--quiet]
atelier review
atelier off
atelier install-adapter <name> [--stdout]
```

**Ativação**: hoje há `/atelier ...` (chat) e o caminho `host-plan/native-plan`
(hooks no agente). Cortar o segundo caminho inteiro:
- Remover seções "host-plan / native plan" de `README.md`, `PROTOCOL.md`,
  `ARCHITECTURE.md`.
- Remover hook references em `.claude/settings.json`, `.cursor/hooks.json`
  que apontam para `native-plan` (manter apenas hooks que o framework
  legitimamente precise, ou — preferível — mover hooks para `dev/` por serem
  ferramenta de desenvolvimento do próprio repo, não produto).
- Remover skill `kit/skills/host-plan-coach.md`.

**Arquivos críticos**:
- `src/cli.ts` (encolher)
- `src/commands/lifecycle.ts` (manter só `cmdOff`)
- `src/commands/host-plan.ts`, `host-plan-nudge.ts`, `native-plan.ts` (deletar)
- `src/commands/rules.ts` (deletar; mover lógica para `install-adapter.ts`)
- `src/commands/doctor.ts` (deletar; mover lógica para `validate.ts`)
- `kit/skills/host-plan-coach.md` (deletar)

**Aceite**: `atelier --help` lista 8 comandos no máximo; todo comando
documentado é não-opcional; testes em `test/host-plan.test.ts` e
`test/native-plan.test.ts` deletados.

---

### Fase 3 — Adapters: 11 módulos → registry data-driven

**Risco**: médio. **Impacto**: adicionar novo agente vira **uma linha**.

Hoje cada arquivo em `src/adapters/<name>.ts` faz 3–6 linhas de "ensure dir +
render body + write file" (ver `src/adapters/cursor.ts` ou
`src/adapters/claude.ts` como exemplo). É pura repetição com 4 parâmetros
diferentes.

**Estrutura nova** (`src/adapters/registry.ts`):
```ts
export type AdapterSpec = {
  name: AdapterName;
  files: Array<{
    path: string;            // ex: "CLAUDE.md", ".cursor/rules/atelier-core.mdc"
    wrap?: (body: string) => string;  // ex: para envolver em frontmatter
  }>;
  extras?: (cwd: string) => Promise<void>;  // raro: claude-code mirrora skills
  label: string;             // ex: "atelier-kit (Cursor)"
};

export const ADAPTERS: Record<AdapterName, AdapterSpec> = { ... };
```

Único renderer (`src/adapters/install.ts`):
```ts
export async function installAdapter(cwd: string, name: AdapterName) {
  const spec = ADAPTERS[name];
  const body = await renderAdapterBody(cwd, name, spec.label);
  for (const file of spec.files) {
    await ensureDir(dirname(join(cwd, file.path)));
    await writeText(join(cwd, file.path), file.wrap ? file.wrap(body) : body);
  }
  if (spec.extras) await spec.extras(cwd);
}
```

**Ações**:
- Criar `src/adapters/registry.ts` com as 11 entradas (extraídas dos módulos
  atuais).
- Substituir `src/adapters/index.ts` (linhas 1-78) por um wrapper fino sobre
  o registry.
- Deletar `src/adapters/{claude,cursor,codex,windsurf,generic,cline,gemini-cli,antigravity,kiro,kilo}.ts`.
- Manter `src/adapters/adapter-utils.ts` (renderer compartilhado), `common.ts`
  (`mirrorSkills`, `claudeAtelierCommand`), `types.ts`, `command-spec.ts`.
- `claude-code` é o único caso com `extras` (espelha skills em
  `.claude/skills/atelier/` via `mirrorSkills`).
- Mover a tabela `adapterFiles` em `validator.ts:298-310` para ler do registry
  (eliminar segunda fonte de verdade).

**Aceite**: novo agente = nova entrada em `ADAPTERS`; nenhum arquivo TS novo;
testes em `test/adapters.test.ts` continuam verdes.

---

### Fase 4 — Skills: 8 → 3

**Risco**: médio-alto (mexe no fluxo que o agente segue). **Impacto**: muito
menos arquivos para manter sincronizados.

**Mapeamento**:
- `questioner.md` → primeira ação dentro de `researcher.md`.
- `repo-analyst.md` + `tech-analyst.md` + `business-analyst.md` → unidos em
  `researcher.md` (com 3 sub-seções; o skill recebe um parâmetro de pista
  baseado em `state.tasks`).
- `designer.md` → continua.
- `planner.md` → continua.
- `reviewer.md` → vira seção "review mode" em `planner.md`.
- `host-plan-coach.md` → deletado (Fase 2).

**Atualizações em código**:
- `src/protocol/validator.ts:77-95` (`expectedSkillForStatus`) — colapsar para
  3 skills (`researcher` para `discovery`, `designer` para `design`, `planner`
  para `synthesis|planning|review`).
- `src/protocol/schema.ts` — Zod enum de skills aceita apenas os 3 novos.
- `src/protocol/validator.ts:280-285` (lista doctor de arquivos esperados) —
  apontar para os 3 skills novos.
- `kit/protocol/skills.yaml` — deletar junto com os outros yamls (Fase 7).
- Testes `test/skill-loader.test.ts` — adaptar.

**Aceite**: `ls kit/skills/` mostra 3 arquivos; validator não conhece os
nomes antigos; um épico `quick` consegue rodar end-to-end com os 3 skills.

---

### Fase 5 — `atelier review` executável (a grande alavanca)

**Risco**: médio. **Impacto**: framework deixa de ser ritual e vira ferramenta.

Hoje `src/commands/review.ts` apenas escreve um `review.md` com uma checklist
em branco e um excerpt do plano (`src/commands/review.ts:33-63`). Tem `git
diff --name-only` (linha 13) mas **não usa** a informação contra
`allowed_files`.

**Novo comportamento**:

1. Carregar `state.slices[*]` e os `allowed_files`/`acceptance_criteria`/
   `validation` de cada slice.
2. Coletar arquivos modificados via `git diff --name-only <baseline>` +
   untracked (já existe na linha 11-21).
3. Para cada slice:
   - **Drift de allowed_files**: `changed \ allowed_files = []`? Se não, listar
     violações.
   - **Validation commands**: executar cada item de `slice.validation` (já
     são "test or validation command" segundo
     `atelier-kit-manifesto.md:623-625`); capturar exit code e ~30 linhas de
     output.
   - **Acceptance criteria**: gerar checkbox por critério (continua manual —
     critérios são prosa observável; auto-marcar não faz sentido).
4. Gerar `review.md` com:
   - Resumo por slice: status (pass/fail/manual), allowed_files diff,
     validation outputs (em `<details>`), critérios como checkboxes.
   - Bloco "Violations" listando arquivos modificados fora de qualquer
     `allowed_files`.
   - Exit code != 0 se houver violação de `allowed_files` ou comando de
     validation que falhou — torna `atelier review` usável em CI.

**Arquivos críticos**:
- `src/commands/review.ts` (reescrever)
- Possivelmente extrair `src/review/` com:
  - `git-diff.ts` (gitChangedFiles, baseline)
  - `slice-check.ts` (diff vs allowed_files por slice)
  - `validation-runner.ts` (execFile com timeout, captura de output)
  - `report.ts` (gera markdown final + exit code)

**Aceite**:
- `atelier review` em um épico onde um arquivo foi modificado fora de
  `allowed_files` retorna exit 1 e marca claramente a violação no
  `review.md`.
- Comandos em `slice.validation` são executados e seu output aparece no
  artefato.
- Critérios continuam como checkboxes manuais (não inventar interpretação).
- Teste novo em `test/review.test.ts` cobre: cenário verde, cenário com drift,
  cenário com validation falhando.

---

### Fase 6 — `plan-ready` que rejeita planos fracos

**Risco**: baixo. **Impacto**: agente é obrigado a entregar slices úteis em
vez de cumprir tabela.

Hoje `validatePlanReady` em `src/protocol/validator.ts:115-143` só checa
**presença** dos campos. Adicionar **heurísticas de qualidade** com mensagens
de erro acionáveis:

- `slice.allowed_files` vazio → erro (já é o caso? confirmar; se for warning
  hoje, virar erro).
- `slice.allowed_files` com padrões catch-all (`src/**`, `**/*`, `*`) → erro
  com mensagem "allowed_files muito amplo para revisão; restrinja".
- `slice.acceptance_criteria` com texto < 8 palavras ou contendo apenas
  termos vagos ("works", "is correct", "is implemented") → warning forte.
- `slice.validation` que não contém pelo menos um comando executável (regex
  para detectar pelo menos uma palavra que pareça shell: `npm`, `pnpm`,
  `pytest`, `cargo`, `make`, `bash`, `node`, etc.) → warning.
- Plano sem `## Risks` com conteúdo real (só `_None._`) e modo `deep` → erro.

**Aceite**: `atelier validate --gate plan-ready` rejeita um plano onde todos
os slices têm `allowed_files: ["src/**"]`; mensagens dizem **como** corrigir.

---

### Fase 7 — Limpeza final

**Risco**: baixo. **Impacto**: encerra dívidas pequenas.

- Deletar `kit/protocol/{gates,modes,skills,workflow}.yaml` (não consumidos em
  runtime; schemas Zod em `src/protocol/schema.ts` são a fonte).
  - Remover referências em `validator.ts:273-279` (lista do doctor).
- Mover `.picklejar/` e os hooks que dependem dele (`.claude/settings.json`,
  `.cursor/hooks.json`) para `dev/` ou `tools/atelier-dev/`, e excluir do
  pacote npm via `files` em `package.json`. Documentar em `CONTRIBUTING.md`
  como infra de desenvolvimento do próprio repo, não parte do produto.
- Decidir o destino do diretório `codex/`: hoje é um projeto exemplo
  duplicado; ou move para `examples/codex/` e mantém só como referência, ou
  deleta. Recomendado: mover para `examples/` e excluir do `files` do
  package.json.
- Atualizar `package.json` campo `files` para refletir o que sobrou de
  `kit/` (3 skills, core.md, schemas) e excluir `dev/`.
- Atualizar `tsup.config.ts` se algum entrypoint mudou de path.
- Atualizar `README.md` tabela de comandos e tabela de adapters.
- Rodar `pnpm test` e ajustar fixtures de teste para a nova surface.

**Aceite**: `npm pack --dry-run` mostra um tarball significativamente menor;
nenhum arquivo `kit/protocol/*.yaml` no pacote; hooks de dev fora do `files`.

---

## Arquivos críticos por categoria

### A reescrever
- `atelier-kit-manifesto.md` → `MANIFESTO.md` (~150 linhas)
- `src/cli.ts` (7 comandos)
- `src/commands/review.ts` (executável)
- `src/protocol/validator.ts` (`validatePlanReady` + colapso de doctor)
- `src/adapters/index.ts` (registry-driven)
- `README.md` (tabelas atualizadas)
- `PROTOCOL.md`, `ARCHITECTURE.md` (encolhidos, dedupes)
- `kit/rules/core.md` (alinhar com 3 skills e fluxo único)

### A criar
- `src/adapters/registry.ts`
- `src/adapters/install.ts` (renderer único)
- `src/review/{git-diff,slice-check,validation-runner,report}.ts`
- `kit/skills/researcher.md` (unifica os 4 hoje)
- `test/review.test.ts`

### A deletar
- `AGENT-USAGE.md`, `kit/METHOD.md`
- `src/commands/{lifecycle,host-plan,host-plan-nudge,native-plan,rules,doctor}.ts`
  (manter `cmdOff` em algum lugar — pode ficar em `lifecycle.ts` reduzido ou
  inline em `cli.ts`)
- `src/adapters/{claude,cursor,codex,windsurf,generic,cline,gemini-cli,antigravity,kiro,kilo}.ts`
  (substituídos pelo registry)
- `kit/skills/{questioner,repo-analyst,tech-analyst,business-analyst,reviewer,host-plan-coach}.md`
- `kit/protocol/{gates,modes,skills,workflow}.yaml`
- `test/{host-plan,native-plan}.test.ts`
- Hooks de produto duplicados em `.claude/`/`.cursor/` (mover para `dev/`)

---

## Estratégia de testes

A suíte atual (`test/`) cobre 5 áreas: protocolo v2, adapters, host-plan,
native-plan, skill-loader. Após o refactor:

- **Manter e ajustar**: `protocol-v2.test.ts` (flow init→new→validate→review;
  ajustar para 7 comandos e 3 skills), `adapters.test.ts` (validar registry),
  `skill-loader.test.ts` (3 skills).
- **Deletar**: `host-plan.test.ts`, `native-plan.test.ts`.
- **Criar**: `test/review.test.ts` cobrindo verde / drift de allowed_files /
  validation failing; `test/plan-ready.test.ts` cobrindo heurísticas novas
  (allowed_files catch-all, critério vago, validation sem comando).

Critério de PR para cada fase: testes verdes + `atelier validate --verbose` em
um repo de exemplo limpo.

---

## Verificação end-to-end

Após todas as fases, verificar manualmente em um repo limpo:

1. `pnpm build && npm pack` — tarball menor que o atual; conteúdo só
   `dist/`, `kit/{rules,skills,schemas}`, 3 docs.
2. Em um repo de teste:
   ```
   atelier init
   atelier install-adapter claude-code   # gera CLAUDE.md + .claude/commands/atelier.md + skills
   atelier new "Add login" --mode quick
   # agente escreve questions.md, depois plan.md com slice
   atelier validate --gate plan-ready    # rejeita se allowed_files=["src/**"]
   # agente corrige; valida ok
   atelier export-plan --adapter claude-code
   # implementação fora dos allowed_files
   atelier review                        # exit 1, review.md mostra violação
   ```
3. `atelier --help` lista 8 comandos no máximo, todos com descrição clara.
4. `ls kit/skills/` mostra 3 arquivos.
5. `ls src/adapters/*.ts` mostra ~5 arquivos (`registry`, `install`,
   `adapter-utils`, `common`, `command-spec`, `types`), não 14.

---

## Agent-first: o refactor preserva (e reforça) a filosofia

A pergunta natural: depois de cortar tanto, o framework continua agent-first?
Sim — e em vários pontos fica **mais** agent-first do que hoje. Fase por fase:

| Fase | Efeito sobre "agent-first" |
|---|---|
| 1 — Poda de docs | Neutro. Encurta o manifesto, mas mantém os 4 pilares que **são** a declaração agent-first: planejar ≠ implementar, opt-in, agente dirige. |
| 2 — Poda de CLI | **Reforça.** Remover `next`/`done` significa que o agente atualiza `state.json` direto, sem ter que voltar para o CLI a cada transição. Cortar o caminho `host-plan`/`native-plan` (onde o framework interceptava o `/plan` do host) remove o único ponto em que o framework tomava iniciativa. |
| 3 — Adapter registry | Neutro. Refactor interno; o agente continua lendo as mesmas regras renderizadas. |
| 4 — Skills 8→3 | Neutro/positivo. Menos arquivos para o agente carregar; mantém a regra "uma skill por fase". |
| 5 — `review` executável | **Reforça.** O agente continua sendo dono de tudo: pesquisa, desenho, escrita do plano, dos slices, da implementação, e da decisão final sobre violações. O framework só executa o que o **agente prometeu** (os `validation` commands escritos por ele) e compara a diff com os `allowed_files` que **ele** declarou. É um linter sobre o contrato que o agente assinou, não um juiz. |
| 6 — `plan-ready` mais forte | Limite consciente. Detectar `allowed_files: ["src/**"]` ou critério vago é o framework dizendo "esse plano não está implementável" — não "essa ideia está errada". Equivalente ao type checker: rejeita shape mal-formada, não substitui o autor. Mensagens devem ser acionáveis, nunca prescritivas sobre o conteúdo. |
| 7 — Limpeza | Neutro. Remove infra que não era produto. |

**Princípios agent-first preservados explicitamente**:

1. **Opt-in continua absoluto.** Inativo por padrão; `/atelier ...` é o único
   gatilho. Sem hooks que interceptam fluxos nativos.
2. **O agente escreve todos os artefatos.** O CLI não gera questions, research,
   design, plan ou review — só valida e exporta o que o agente produz.
3. **Implementação permanece nativa.** Após `planned`, o framework "sai do
   caminho" — exatamente o que diz `MANIFESTO §3`. O refactor reforça isso
   cortando hooks que tentavam ficar no meio.
4. **O contrato é do agente, não do framework.** `plan-ready` checa que o
   contrato é verificável; `review` executa o contrato. Em ambos os casos, o
   conteúdo do contrato é o agente quem decide. O framework só se recusa a
   aprovar contratos vagos demais para serem auditáveis.
5. **Verificação ≠ autoridade.** Mesmo no review executável, exit code != 0
   significa "encontrei desvio do contrato declarado", não "você fez errado".
   A interpretação fica com o agente/humano: o desvio pode ser legítimo e
   documentado em `## Deviations` do review.

**O risco oposto** — virar "framework-first" ou "process-first" — fica
**menor** depois do refactor, porque:
- Não há mais um caminho onde o framework intercepta o `/plan` do agente.
- Não há mais comandos opcionais (`next`/`done`) que sugerem que o framework é
  o motor do trabalho.
- Skills colapsadas significam menos peso de "leia esses 8 papéis antes de
  começar".
- Manifesto curto significa que o agente (e o humano) entende o framework em
  5 minutos, não em 694 linhas de princípios.

Em uma frase: **o refactor tira ferro do framework para que o agente apareça**.

---

## O que NÃO está neste plano (escopo deliberadamente fora)

- Multi-epic simultâneo: continua um épico ativo de cada vez.
- Dependências entre slices: slice continua independente.
- UI/dashboard: continua CLI puro.
- Integração com Plannotator: continua opcional, sem comando próprio.
- Telemetria: nada novo.

Esses são caminhos possíveis depois, mas seriam **mais** features. O objetivo
deste refactor é exatamente o oposto: tornar o que existe mais afiado.
