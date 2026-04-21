# Arquitetura do framework e fluxo entre fases do atelier-kit

Este documento descreve, em detalhe, como o framework está implementado hoje, como ele foi pensado para operar e qual e a diferenca entre:

- **execucao real no codigo**, e
- **execucao metodologica esperada entre fases**.

Essa distincao e a chave para entender o projeto corretamente.

## 1. O que este projeto e

O `atelier-kit` e uma **CLI em TypeScript** para instalar e manter um fluxo de trabalho guiado por fases dentro de um repositorio.

Ele **nao** e:

- um orquestrador de jobs em background,
- uma maquina de estados automatica,
- um framework web,
- um sistema que avanca fases sozinho.

A responsabilidade central dele e:

1. criar uma estrutura `.atelier/` com metodo, skills, templates e gates,
2. persistir o estado da sessao, principalmente a fase atual,
3. adaptar esse metodo para diferentes ambientes de agente,
4. validar se os artefatos produzidos se parecem com o formato esperado para cada fase.

As partes principais da implementacao estao em:

- `src/cli.ts` - ponto de entrada da CLI
- `src/commands/*` - comandos da CLI
- `src/state/*` - persistencia e leitura de estado
- `src/adapters/*` - integracoes por ambiente
- `src/gates/*` - validadores dos artefatos e das skills
- `src/skill-loader.ts` - parser das skills e mapeamento fase -> skill
- `kit/*` - conteudo estatico copiado para `.atelier/`

## 2. Modelo mental do framework

O jeito certo de pensar no projeto e:

> **um framework de coordenacao de sessoes de trabalho com IA, baseado em fases, artefatos e restricao de contexto**

Ele e composto por quatro blocos cooperando entre si.

### 2.1 O kit

O diretorio `kit/` contem o metodo e os ativos reutilizaveis:

- `kit/METHOD.md` - define o metodo operacional
- `kit/skills/*/SKILL.md` - instrucao especializada por fase
- `kit/templates/*.md` - artefatos iniciais
- `kit/gates/*.md` - documentacao dos gates

No `init`, esse conteudo e copiado para `.atelier/` dentro do repositorio do usuario.

### 2.2 O estado persistente

O estado do fluxo fica em dois lugares:

- `.atelierrc` - configuracao global do adapter e do modo
- `.atelier/context.md` - estado autoritativo da sessao

O ponto mais importante aqui e:

**a fase atual nao fica numa estrutura interna de memoria nem num banco; ela fica num arquivo**

Ou seja, a "execucao" do framework entre fases e, na pratica, uma combinacao de:

- reescrever arquivos de estado,
- ler artefatos anteriores,
- regenerar instrucoes de adapter quando necessario.

### 2.3 Os adapters

Os adapters traduzem o metodo `.atelier/` para o formato de cada ambiente de agente:

- Claude Code -> `.claude/skills/` + `CLAUDE.md`
- Cursor -> `.cursor/skills/` + `.cursor/rules/atelier-core.mdc`
- Codex CLI -> `AGENTS.md`
- Windsurf -> `.windsurfrules`
- Generic -> `atelier-system-prompt.txt`

Eles nao mudam a logica do framework; eles mudam **como o agente recebe e consome essa logica**.

### 2.4 Os gates

Os gates sao validadores heuristicas. Eles observam os artefatos e verificam se:

- a forma parece correta,
- a estrutura segue o metodo,
- alguns sinais de incoerencia estao presentes ou ausentes.

Importante:

**gates nao executam a fase, nao avancam fase e nao controlam um pipeline automatico**

Eles apenas dizem se o resultado produzido **parece consistente** com o contrato esperado.

## 3. Arquitetura de runtime

## 3.1 Entrypoint da CLI

O arquivo `src/cli.ts` registra os comandos:

- `init`
- `phase <name>`
- `status`
- `return <phase> --reason`
- `mode <quick|standard|deep>`
- `handoff`
- `doctor`
- `validate <phase>`
- `install-adapter <name>`

A CLI usa **Commander** e e compilada com **tsup** para `dist/cli.js`.

## 3.2 Resolucao do kit empacotado

Em `src/paths.ts`, `getKitRoot()` localiza o diretorio `kit/` ao lado do build, exceto quando `ATELIER_KIT_ROOT` esta definido para testes.

Isso significa que o pacote distribuido possui dois tipos de conteudo:

- codigo executavel em `dist/`
- conteudo metodologico estatico em `kit/`

Essa separacao e boa porque permite evoluir o metodo com pouco acoplamento ao codigo da CLI.

## 4. Ciclo de instalacao

O comando principal para adotar o framework e `atelier-kit init`.

## 4.1 O que o `init` faz

O arquivo `src/commands/init.ts` executa a seguinte sequencia:

1. escolhe o `adapter` e o `mode`, por prompt ou por default,
2. cria `.atelier/` e `.atelier/artifacts/`,
3. copia todo o conteudo de `kit/` para `.atelier/`,
4. grava `.atelier/brief.md`,
5. grava os artefatos iniciais em `.atelier/artifacts/`,
6. grava `.atelierrc`,
7. grava `.atelier/context.md` com a fase inicial `brief`,
8. instala o adapter escolhido na raiz do repositorio.

## 4.2 Resultado do `init`

Depois do `init`, o repositorio passa a ter:

- `.atelier/METHOD.md`
- `.atelier/skills/...`
- `.atelier/templates/...`
- `.atelier/gates/...`
- `.atelier/brief.md`
- `.atelier/artifacts/*.md`
- `.atelier/context.md`
- `.atelierrc`
- arquivos de adapter como `AGENTS.md`, `.windsurfrules`, `CLAUDE.md`, `.cursor/rules/atelier-core.mdc` ou `atelier-system-prompt.txt`

Ou seja, o `init` nao "liga um sistema". Ele **materializa um workspace metodologico** dentro do repositorio.

## 5. Modelo de estado

## 5.1 `.atelierrc`

O `.atelierrc` armazena configuracao mais estatica:

- `version`
- `adapter`
- `mode`

Esse arquivo e gerido por `src/state/atelierrc.ts`.

## 5.2 `.atelier/context.md`

Esse e o arquivo mais importante do framework.

`src/state/context.ts` le e escreve esse documento, e `src/state/schema.ts` define sua estrutura com Zod.

O frontmatter aceita:

- `atelier_context_version`
- `phase`
- `mode`
- `adapter`
- `gate_pending`
- `updated_at`
- `returns`

O corpo do arquivo pode conter notas livres.

### Implicacao pratica

Quando a fase muda, o sistema **nao** atualiza uma estrutura de runtime duradoura.

Ele simplesmente:

1. le `context.md`,
2. muda o campo `phase`,
3. regrava o arquivo,
4. opcionalmente regenera o adapter.

Portanto, a transicao entre fases e persistencia documental, nao orquestracao automatica.

### Nuance importante sobre duplicacao de estado

Embora `.atelierrc` seja o lugar principal para `adapter` e `mode`, o schema de `context.md` tambem aceita esses campos.

Na pratica:

- `init` grava `mode` e `adapter` em ambos,
- `mode` atualiza apenas `.atelierrc`,
- `install-adapter` atualiza apenas `.atelierrc`,
- `phase` e `return` preservam o que ja existe em `context.md`, mas nao reconciliam esses campos com `.atelierrc`.

Isso significa que ha uma **duplicacao potencial de informacao** entre os dois arquivos.

Hoje isso nao quebra o fluxo principal, porque:

- a fase e o elemento realmente autoritativo para selecao de skill,
- `status` le `.atelierrc` para mostrar `adapter` e `mode`,
- `refreshFallbackAdapters()` tambem consulta `.atelierrc`.

Mesmo assim, arquiteturalmente, vale notar que `mode` e `adapter` em `context.md` estao mais proximos de um espelho inicial do que de uma fonte de verdade plenamente sincronizada.

## 5.3 Historico de retorno

O comando `return` faz mais do que mudar a fase.

Ele tambem acrescenta uma entrada em `returns[]` com:

- `from`
- `to`
- `reason`
- `at`

Isso cria um pequeno historico auditavel de regressao de fase.

## 6. Fases canonicas do framework

As fases validas sao definidas em `src/state/schema.ts`:

- `brief`
- `questions`
- `research`
- `design`
- `outline`
- `plan`
- `implement`
- `review`
- `ship`
- `learn`

Essas fases batem com o metodo descrito em `kit/METHOD.md`.

## 6.1 Ideia geral do fluxo

O fluxo pretendido pelo metodo e:

1. registrar o problema,
2. levantar perguntas neutras,
3. pesquisar as respostas,
4. desenhar o estado desejado,
5. transformar isso em estrutura e slices,
6. quebrar em plano executavel,
7. implementar slice por slice,
8. revisar contra o plano,
9. preparar ship com aprovacao humana,
10. registrar aprendizado e decisoes duraveis.

## 6.2 Mapeamento fase -> skill

O arquivo `src/skill-loader.ts` faz o mapeamento em runtime:

- `questions` -> `questions`
- `research` -> `researcher`
- `design` -> `designer`
- `outline` -> `designer`
- `plan` -> `planner`
- `implement` -> `implementer`
- `review` -> `reviewer`
- `learn` -> `chronicler`

Nao existe skill dedicada para:

- `brief`
- `ship`

Nesses casos, o sistema depende mais de `METHOD.md` e do processo humano.

## 6.3 Artefatos esperados por fase

| Fase | Leitura principal | Saida principal |
| --- | --- | --- |
| `brief` | definicao humana do problema | `.atelier/brief.md` |
| `questions` | `brief.md` | `.atelier/artifacts/questions.md` |
| `research` | `questions.md` | `.atelier/artifacts/research.md` |
| `design` | `brief.md`, `research.md` | `.atelier/artifacts/design.md` |
| `outline` | `brief.md`, `research.md`, `design.md` | `.atelier/artifacts/outline.md` |
| `plan` | `design.md`, `outline.md` | `.atelier/artifacts/plan.md` |
| `implement` | `outline.md`, `plan.md` | codigo + `.atelier/artifacts/impl-log.md` |
| `review` | `outline.md`, `plan.md`, `impl-log.md` | `.atelier/artifacts/review.md` |
| `ship` | review + checklist do projeto | sem arquivo forte no codigo |
| `learn` | contexto + artefatos | `.atelier/artifacts/decision-log.md` |

## 7. Como a execucao entre fases funciona de verdade

Este e o ponto central da avaliacao.

O framework **nao** implementa uma maquina de estados completa com:

- regras de transicao obrigatorias,
- pre-condicoes fortes,
- aprovacoes persistidas em estado,
- avancos automaticos de fase,
- jobs de fase encadeados.

Em vez disso, a execucao entre fases funciona como uma cadeia de handoffs orientados por arquivo.

## 7.1 Passo 1: uma fase e escolhida

Uma fase muda quando:

- o usuario executa `atelier-kit phase <name>`,
- o usuario executa `atelier-kit return <phase> --reason ...`,
- um agente segue a convencao do metodo e o humano atualiza o estado manualmente.

## 7.2 Passo 2: o estado e persistido

Em `src/commands/phase.ts`, a fase e validada contra o enum e depois enviada para `setPhase()`, que regrava `.atelier/context.md`.

Em `src/commands/return-cmd.ts`, o mesmo arquivo e regravado, agora com o historico de retorno atualizado.

## 7.3 Passo 3: alguns adapters sao regenerados

Depois da troca de fase, `refreshFallbackAdapters()` reinstala apenas:

- `generic`
- `windsurf`
- `codex`

Isso acontece porque esses adapters dependem diretamente da fase atual materializada em arquivo.

Ja Cursor e Claude funcionam de outro jeito: eles instalam instrucoes fixas que dizem ao agente para **ler `context.md` toda vez**.

## 7.4 Passo 4: o agente descobre o proximo contexto de execucao

O agente ou a proxima sessao deve:

1. ler `.atelier/context.md`,
2. identificar a fase atual,
3. carregar a skill correspondente,
4. ler apenas os artefatos permitidos por essa skill,
5. produzir o artefato esperado da fase.

Esse e o coracao do design "skills-first".

## 7.5 Passo 5: o artefato gerado vira a entrada da proxima fase

O encadeamento real entre fases nao e feito por jobs internos. Ele e feito por **documentos**.

Exemplos:

- `questions.md` alimenta `research`
- `research.md` alimenta `design`
- `design.md` e `outline.md` alimentam `plan`
- `plan.md` alimenta `implement`
- `impl-log.md` alimenta `review`

Em outras palavras, o verdadeiro "motor" do fluxo hoje e:

> **campo `phase` + artefatos + adapters que expõem a skill correta**

Nao existe um motor oculto alem disso.

## 8. Como o framework foi planejado para funcionar entre fases

Pelo `METHOD.md` e pelas `SKILL.md`, da para ver claramente a intencao de design.

## 8.1 Questions

A fase `questions` foi pensada para:

- ler o `brief`,
- transformar objetivo em perguntas verificaveis,
- classificar cada pergunta como `[repo]`, `[tech]` ou `[market]`,
- evitar resposta, desenho ou recomendacao prematura.

A ideia aqui e separar:

- **captura de intencao**, e
- **levantamento de fatos necessarios**

## 8.2 Research

A fase `research` foi desenhada para operar em isolamento do `brief`.

O pesquisador le `questions.md`, e **nao** deveria ler o documento de objetivo original. Isso e uma decisao metodologica importante: reduzir viés de implementacao antecipada.

Dentro de `research`, ha tres estagios internos:

1. `[repo]` - mapeamento do repositorio
2. `[tech]` - pesquisa tecnica externa
3. `[market]` - benchmark de mercado ou UX

Esses estagios **nao** sao fases do enum. Sao subetapas internas de uma unica fase.

## 8.3 Design -> Outline -> Plan

Essa trilha e a principal ideia de execucao planejada.

### Design

`design.md` responde ao "por que" e ao "o que":

- estado atual,
- estado desejado,
- padroes a seguir,
- padroes a evitar,
- decisoes em aberto.

### Outline

`outline.md` responde ao "qual a forma da solucao":

- limites,
- componentes,
- interfaces,
- contratos,
- slices,
- ordem de construcao.

### Plan

`plan.md` responde ao "como executar":

- tarefas por slice,
- ordem de implementacao,
- dependencias,
- testes,
- unidades pequenas de trabalho.

O modelo planejado, resumindo, e:

> **design define direcao -> outline define estrutura -> plan define ordem executavel**

## 8.4 Implement

A implementacao foi pensada para acontecer em **vertical slices**.

Ou seja, a ideia nao e:

- primeiro mexer em toda a persistencia,
- depois em toda a API,
- depois em toda a UI.

A ideia e:

- escolher o primeiro slice,
- cruzar todas as camadas necessarias,
- validar esse slice,
- registrar desvios,
- so depois ir para o proximo.

Isso reduz o risco de abrir frentes grandes demais sem validacao intermediaria.

## 8.5 Review

A fase `review` foi pensada como papel separado da implementacao.

O revisor deve confrontar:

- codigo produzido,
- `outline.md`,
- `plan.md`,
- `impl-log.md`

A revisao nao deveria reimplementar. Ela deveria apontar divergencias, riscos e faltas.

## 8.6 Ship e Learn

`ship` e mais um checkpoint operacional do que uma fase fortemente implementada.

`learn` serve para registrar decisoes e licoes duraveis em `decision-log.md`, usando:

- historico de retorno,
- impl-log,
- review,
- demais artefatos da sessao.

## 9. Papel dos adapters no fluxo

Cada adapter realiza a mesma ideia, mas de forma diferente.

## 9.1 Cursor e Claude

Esses adapters instalam instrucoes relativamente estaveis e vendem as skills para o ambiente.

Eles dependem do seguinte contrato:

1. o agente sempre deve ler `.atelier/context.md`,
2. o campo `phase` e a fonte de verdade,
3. a skill ativa deve ser escolhida com base nessa fase.

Por isso, eles nao precisam ser regenerados toda vez.

## 9.2 Generic, Codex e Windsurf

Esses adapters sao mais dependentes da fase atual materializada.

- `generic` gera um prompt unico com o metodo e a skill ativa embutida
- `codex` regenera `AGENTS.md` apontando para a skill ativa
- `windsurf` regenera `.windsurfrules` com a fase e trecho da skill ativa

Por isso, apos mudar a fase, o codigo reinstala esses adapters.

## 10. O que o codigo realmente valida hoje

Os gates possuem niveis de maturidade diferentes.

## 10.1 Gate de `questions`

Ele verifica:

- se os bullets possuem `[repo]`, `[tech]` ou `[market]`,
- se o conteudo parece coerente com o escopo,
- se ha sinais de pergunta prescritiva,
- se ha vazamento indevido do `brief` para as perguntas.

Esse gate e relativamente forte para o estagio inicial.

## 10.2 Gate de `research`

Ele verifica:

- se cada pergunta possui bloco de resposta,
- se respostas `[repo]` trazem referencia de codigo ou caminho,
- se respostas `[tech]` e `[market]` trazem URL,
- se a resposta esta no stage correto.

Esse tambem e um gate relativamente concreto.

## 10.3 Gate de `design`

Ele verifica:

- se `design.md` nao esta curto ou excessivamente longo,
- se as secoes obrigatorias existem.

Valida bem forma, mas pouco sobre qualidade semantica.

## 10.4 Gate de `plan`

Hoje ele e mais fraco do que a metodologia sugere.

Na pratica, ele:

- verifica existencia de `outline.md` e `plan.md`,
- tolera `_TBD_`,
- quase nao emite erro de desalinhamento real entre outline e plan.

Ou seja, a ideia metodologica de "plano estritamente derivado do outline" ainda nao esta forte no codigo.

## 10.5 Gate de `implement`

Ele verifica:

- se `plan.md` existe,
- se `impl-log.md` existe,
- se slices nomeados no plano aparecem no log.

Ele reforca a disciplina de registro, mas nao valida profundamente a implementacao real contra o plano.

## 10.6 `doctor`

O `doctor` agrega:

- instruction budget
- skill shape
- questions
- research
- design
- plan
- implement

Ou seja, ele funciona como um "estado geral de saude" da estrutura do metodo.

## 11. Avaliacao tecnica da implementacao atual

No geral, a implementacao e boa como estrutura conceitual e como kit operacional, mas ainda esta mais perto de um **framework de coordenacao** do que de um **engine de workflow**.

## 11.1 Pontos fortes

### 1. Separacao limpa entre metodo e runtime

O metodo fica em `kit/`, enquanto o runtime da CLI fica em `src/`.

Isso torna a manutencao boa e reduz acoplamento.

### 2. Estado simples e inspecionavel

Usar `.atelier/context.md` e `.atelierrc` e uma escolha boa porque:

- e facil de versionar,
- e facil de depurar,
- e portavel,
- e legivel por humanos e agentes.

### 3. Handoff explicito entre fases

Os artefatos intermedios materializam o raciocinio da sessao.

Isso e muito melhor do que depender apenas de contexto conversacional efemero.

### 4. Boa portabilidade entre ambientes

A camada de adapters permite levar o mesmo metodo para Cursor, Claude, Codex, Windsurf e um modo generico.

### 5. Boa ideia de isolamento em research

A decisao de impedir o pesquisador de ler `brief.md` e forte do ponto de vista metodologico. Ela combate vies de confirmacao cedo demais.

## 11.2 Limitacoes importantes

### 1. Progressao de fase e manual

Qualquer fase valida pode ser setada diretamente.

Nao existe:

- grafo de transicao,
- bloqueio por pre-requisito,
- obrigacao de gate antes de avancar,
- automacao de aprovacoes.

### 2. Os modos sao mais descritivos do que executaveis

`quick`, `standard` e `deep` estao persistidos e documentados, mas quase nao alteram o comportamento real do runtime.

Hoje, eles representam mais uma **intencao de operacao** do que uma logica fortemente codificada.

### 3. `gate_pending` e apenas informativo

O campo existe no schema, aparece no `status` e no adapter generico, mas nao ha logica que o governe.

### 4. O framework depende bastante da obediencia do agente

Muitos dos contratos do sistema dependem de o agente:

- ler o `context.md`,
- escolher a skill correta,
- respeitar `reads` e `produces`,
- nao pular fases conceituais por conta propria.

### 5. Validacoes tardias ainda sao rasas

O comeco do fluxo esta razoavelmente bem protegido.

Mas `outline`, `plan`, `ship` e a relacao forte entre planejamento e execucao ainda nao estao tao bem materializados em codigo.

### 6. `context.md` mistura estado autoritativo com espelho parcial de configuracao

O projeto declara `context.md` como estado autoritativo da sessao, o que e correto para `phase`.

Mas `mode` e `adapter` nao seguem o mesmo padrao de sincronizacao forte. Isso sugere que o design ainda esta no meio do caminho entre:

- um documento de sessao estritamente autoritativo, e
- um documento de sessao enriquecido com metadados redundantes.

## 11.3 Gaps concretos da implementacao

### A. `outline` nao tem validador proprio

Atualmente `validate outline` cai no mesmo gate de `design`.

Na pratica, isso significa que o projeto ainda nao valida de forma especifica a qualidade estrutural de `outline.md`.

### B. O gate de `plan` esta abaixo da ambicao do metodo

Pelo metodo, `plan` deveria ser uma expansao disciplinada do `outline`.

No codigo atual, esse vinculo quase nao e exigido de verdade.

### C. Nao ha aprovacoes formais persistidas

Referencias como `/approve-design`, `/approve-outline` e `/approve` aparecem como convencao operacional, mas nao como estado forte no sistema.

### D. `ship` existe mais no discurso do que na implementacao

A fase existe no enum e no metodo, mas nao possui:

- artefato obrigatorio,
- gate proprio,
- comando operacional dedicado.

## 12. Interpretacao pratica: o que este framework pretende ser

Pela implementacao atual, a intencao do projeto parece ser a de um "sistema operacional leve" para sessoes de coding agent, com estas caracteristicas:

1. o humano registra o objetivo em `brief.md`,
2. o agente formula perguntas verificaveis,
3. a pesquisa responde essas perguntas sem antecipar solucao,
4. planejamento acontece em camadas antes de codar,
5. implementacao acontece em slices verticais,
6. revisao e separada de implementacao,
7. tudo isso pode ser transportado entre diferentes ambientes de agente.

Entao, o projeto esta mais proximo de:

> **um contrato de colaboracao entre humano e agente, baseado em fases e artefatos**

do que de:

> **um sistema automatico que executa fases sozinho**

## 13. Distincao final: duas formas de "execucao"

Para nao interpretar o framework errado, vale separar duas ideias.

## 13.1 Execucao que o codigo implementa diretamente

O codigo faz diretamente estas coisas:

- cria arquivos,
- copia kit,
- persiste estado,
- troca fase,
- reescreve adapters,
- valida artefatos,
- imprime status e handoff.

## 13.2 Execucao que o metodo espera que aconteca

O metodo espera que o processo humano/agente faca isto:

- avancar por fases disciplinadas,
- restringir contexto por skill,
- preservar evidencias de uma fase para outra,
- inserir checkpoints humanos de aprovacao,
- impedir que implementacao destrua a camada de planejamento.

## 13.3 Conclusao central

O codigo implementa muito bem a **infraestrutura do metodo**.

Mas a **orquestracao forte do metodo** ainda e majoritariamente social e documental, nao programatica.

Em resumo:

> hoje, o framework funciona como um **scaffold de workflow com estado persistido, skills e gates**

e foi claramente planejado para sustentar um processo em que:

> **cada fase produz um artefato verificavel que serve de entrada disciplinada para a fase seguinte**

Essa e a ideia de execucao entre fases aqui.
