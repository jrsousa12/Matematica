# CLAUDE.md — App de Matemática 9º Ano

Este arquivo é carregado automaticamente em toda sessão. Ele contém:
1. **Como trabalhar** neste repositório (abaixo).
2. **A especificação completa v3.0** (fonte de verdade do projeto).

O estado atual, as decisões já tomadas e o formato dos arquivos de conteúdo estão em `HANDOFF.md`.
Leia-o antes de começar qualquer tarefa e atualize-o ao terminar.

## Como trabalhar

- **Uma parte por vez.** Faça só a tarefa pedida, mostre o resultado e pare. Não avance para a próxima parte sem o professor pedir.
- **Partes pequenas:** cada entrega deve caber em poucos arquivos e poder ser revisada rapidamente.
- **Antes de editar:** leia os arquivos envolvidos. Não reescreva arquivos que já funcionam sem necessidade.
- **Ao terminar uma parte:** atualize a tabela "Estado atual" e a lista "Próximos passos" do `HANDOFF.md`; registre lá qualquer decisão nova que não esteja na especificação.
- **Conteúdo pedagógico** (lições e questões) é do professor-autor: proponha, mas não publique conteúdo sem revisão.
- **Respostas em português.**

## Protocolo de economia de tokens (protocolo-token)

Origem: `.claude/skills/protocolo-token/` (comando `/protocolo-token`). Resumo das regras que valem aqui:

- **Público:** o dono é professor e não programa; explicar em português simples.
- **Idioma:** sempre PT-BR, inclusive resumos, avisos e mensagens de commit.
- **Limite de arquivo:** nenhum arquivo de código acima de 300 linhas (ideal abaixo de 200). Ao ler um acima do limite, propor plano de modularização antes de editar. Nunca editar arquivo acima do limite sem perguntar.
- **Exceções toleradas:** nenhuma. `componentes.css` foi dividido (agora `componentes.css` 195 linhas + `telas.css` 110).
- **Edição e leitura:** editar só o trecho, sem reescrever o arquivo. Ler só o necessário, com `grep` e intervalos de linhas. Arquivos de dados (`js/data/*.json`) nunca inteiros: localizar com `grep` e ler o trecho.
- **Plano antes do código** em tarefas complexas, validado com o dono.
- **Comandos silenciosos:** usar `-q` ou filtrar a saída (`| tail -2`, `| grep -E "(FAIL|PASS|Error)"`). Nunca despejar logs inteiros.
- **Motores:** tarefa repetida (converter, conferir, corrigir em lote) vira script pequeno; propor ao dono antes e registrar em "Comandos úteis". Testes criados viram arquivos permanentes; procurar um existente antes de criar outro.
- **Sessão:** mudou de assunto, lembrar o dono de usar `/clear`; conversa longa na mesma tarefa, sugerir `/compact` com direcionamento. Só o dono executa esses comandos.
- **Vigia:** avisar em uma frase (motivo + ação) quando um arquivo se aproximar de 300 linhas, houver releitura desnecessária ou a mesma tarefa for feita à mão pela 2ª vez.
- **Dicas ao dono (quando couber):** uma tarefa por conversa; indicar o arquivo com `@nome`; pedidos diretos; Sonnet ou Haiku para tarefas simples e Opus para planos difíceis; `/compact` perto de 50% de contexto.

### Comandos úteis

- Servir o app do aluno: `cd app-matematica-9ano && python3 -m http.server 8080` (abrir `http://localhost:8080`).
- Conteúdo: `app-matematica-9ano/js/data/` (`blocos.json`, `licoes-loteN.json`, `questoes-loteN.json`). Ao mudar conteúdo, subir `content_version` em `blocos.json` e `VERSAO` em `sw.js`.
- Teste de ponta a ponta do app do aluno: com o servidor ativo, `cd app-matematica-9ano && node tests/e2e-aluno.mjs` (Playwright; simula datas com `page.clock`; imprime OK/FALHA por verificação).
- Testes unitários do motor: `cd app-matematica-9ano && node --test 2>&1 | grep -E "^# (pass|fail)"` (não precisa de servidor).
- Painel do professor: servir com `cd painel-professor-9ano && python3 -m http.server 8081`; testes unitários com `cd painel-professor-9ano && node --test 2>&1 | grep -E "^# (pass|fail)"`; ponta a ponta com `node tests/e2e-painel.mjs` (sobe o próprio servidor e usa os snapshots de teste).
- Verificação rápida (motor): `node ferramentas/verificar.mjs` (na raiz). Confere a regra dos 300 linhas, a lista `ARQUIVOS` do `sw.js` e roda os testes unitários. Imprime só OK/AVISO/FALHA. Rodar antes de cada commit.
- Snapshots de teste para o painel (motor): `node ferramentas/gerar-snapshots.mjs [--hoje AAAA-MM-DD] [--semente N]`. Gera 24 alunos fictícios (faixas alta, média, baixa, risco de acerto e sem exportar), 1 exportação antiga repetida e 9 arquivos com defeito em `problemas/`. Usa as regras reais do motor do app. A saída vai para `ferramentas/saida/snapshots/` (fora do git).
- Lint e build: não há (arquivos estáticos).
- Arquivos gerados automaticamente: `ferramentas/saida/` (snapshots de teste; não editar nem versionar).
- Próximas tarefas: ver `HANDOFF.md`.

## Regras de código (resumo da seção 5)

- Máximo de ~250–300 linhas por arquivo `.js` ou `.css`, responsabilidade única.
- Separação estrita: UI em `js/ui/`; regras em `js/motor/`, `js/import/`, `js/analytics/`; persistência em `js/db/`.
- Dexie local (`vendor/dexie.min.js`), stores em português. Sem build e sem npm: ES modules puros e arquivos estáticos.
- Datas sempre no fuso local do dispositivo (`js/util/datas.js`).
- Interface em pt-BR, com acentos, sem emojis.
- Todo arquivo novo do PWA do aluno precisa entrar na lista `ARQUIVOS` de `sw.js`.

## Como testar

- Servir localmente: `cd app-matematica-9ano && python3 -m http.server 8080` e abrir `http://localhost:8080`.
- Módulos puros de `js/motor/` podem ser testados com `node --test` (não importam Dexie).

---

# Especificação Completa — App de Estudo de Matemática (9º Ano)
**Versão:** 3.0 (Consolidado Final — Pronto para Implementação no Claude Code)  
**Arquitetura:** Local-First · PWA (Aluno) + Web Estática (Professor) · Zero Servidor

---

## 1. Visão Geral, Público e Métricas

### 1.1 Problema e Proposta de Valor
* **Problema:** Alunos do 9º ano da rede pública não têm hábito de estudo diário em casa, perdem motivação após a aula e acumulam lacunas de base (recomposição de aprendizagem).
* **Proposta de Valor:** Transformar o estudo de matemática em um hábito diário gamificado de 10–15 minutos, alinhado às avaliações externas (**SAEB > OBMEP > OLITEF**), funcionando 100% offline após o primeiro carregamento.
* **Escopo do Piloto:** 1 turma de 9º ano conduzida pelo próprio professor-autor, durante **10 semanas** (1 bloco por semana), a partir de **meados de fevereiro** até o final de abril.

### 1.2 Métricas e Perguntas de Pesquisa
* **Métrica-Norte:** Sessões de prática concluídas por semana por aluno ativo (meta: $\ge 3$).
* **Métricas de Saúde:** Streak médio ($\ge 3$), retenção D7/D30, % de acerto por bloco, taxa de exportação semanal ($\ge 90\%$).
* **Métrica de Impacto (Aprendizagem):** Ganho de acerto entre Avaliação Diagnóstica Pré (Semana -1) e Pós (Semana 11) em papel (20 questões SAEB, 2 por bloco), cruzando 3 faixas de uso extraídas do painel: Alta adesão ($\ge 3$ sessões/semana), Média ($1\text{--}2$) e Baixa/Nula ($< 1$, grupo de controle natural).
* **3 Perguntas do Piloto:** (1) Alunos sustentam hábito regular sem obrigação externa? (2) Uso regular melhora acerto nos blocos? (3) Professor solo opera o sistema sem sobrecarga?

---

## 2. Currículo, Conteúdo e Plano de Produção

### 2.1 Os 10 Blocos de Recomposição (10 Semanas)
| # | Bloco | Camada | Proporção Contextualizada |
| :-: | :--- | :--- | :---: |
| 1 | Adição e subtração com naturais | 1 — Fundamentos | 50% (7–8 de 15) |
| 2 | Multiplicação e divisão com naturais | 1 — Fundamentos | 50% (7–8 de 15) |
| 3 | Inteiros: adição e subtração com sinais | 1 — Fundamentos | 50% (7–8 de 15) |
| 4 | Inteiros: multiplicação e divisão com sinais | 1 — Fundamentos | 50% (7–8 de 15) |
| 5 | Expressões numéricas (ordem das operações) | 1 — Fundamentos | 50% (7–8 de 15) |
| 6 | Frações: representação, equivalência, comparação | 2 — Racionais | 60% (9 de 15) |
| 7 | Operações com frações: adição e subtração | 2 — Racionais | 60% (9 de 15) |
| 8 | Operações com frações: multiplicação e divisão | 2 — Racionais | 60% (9 de 15) |
| 9 | Decimais: operações | 2 — Racionais | 60% (9 de 15) |
| 10 | Porcentagem básica | 2 — Racionais | 60% (9 de 15) |

### 2.2 Volume, Padrão de Qualidade e Cronograma em Lotes
* **Volume Total:** 10 lições + 150 questões objetivas (15 por bloco). Sem vídeos.
* **Padrão da Lição:** 3 a 4 parágrafos curtos (máx. 40 palavras/parágrafo) + **3 exemplos resolvidos** passo a passo (1 direto, 1 intermediário, 1 contextualizado).
* **Padrão das 15 Questões por Bloco:**
  * **Dificuldade:** 5 fáceis · 6 médias · 4 difíceis (estilo SAEB/OBMEP).
  * **Desafio Diário:** Sorteia 1 questão difícil do bloco atual ou anteriores (sem precisar criar banco extra).
  * **Distratores:** Alternativas A, B, C, D devem refletir erros reais do 9º ano (ex.: jogo de sinal, soma direta de denominadores, erro de vírgula).
  * **Formatação:** HTML simples (`<sup>`, `<sub>`, frações estilizadas em CSS), zero imagens externas.
* **Cronograma de Produção (3 Lotes):**
  * **Lote 1 (Semanas -3 e -2):** Blocos 1, 2 e 3 (3 lições + 45 questões).
  * **Lote 2 (Semana -1):** Blocos 4, 5 e 6 (3 lições + 45 questões).
  * **Lote 3 (Semanas 2 e 3 do piloto):** Blocos 7, 8, 9 e 10 (4 lições + 60 questões).

---

## 3. Regras de Negócio, Motor Adaptativo e Gamificação

### 3.1 Composição da Sessão de Prática (5 Questões)
* **Dias normais:** 3 questões do bloco atual + 2 de revisão (nas posições 2 e 4).
* **1º dia de bloco novo:** 5 questões do bloco novo.
* **Curva de dificuldade na sessão:** `fácil → média → difícil → média → fácil`. Sobe dificuldade apenas se acertar; se errar fácil, mantém fácil.
* **Prioridade no bloco atual:** (1) não vistas → (2) erradas pendentes → (3) acertadas há mais tempo.
* **Prioridade na revisão:** (1) bloco com menor domínio ($< 60\%$) → (2) erros com $\ge 3$ dias → (3) âncora de bloco dominado. Nunca repetir o mesmo bloco de revisão na mesma sessão.
* **Revisão espaçada:** Erro $\rightarrow +3\text{d}$ $\rightarrow$ erro de novo $\rightarrow +7\text{d}$ $\rightarrow$ acerto $\rightarrow +14\text{d}$ $\rightarrow$ acerto de novo $\rightarrow$ sai da fila.
* **Adaptação e avanço de bloco:**
  * $\ge 80\%$ nas últimas 10 questões: reduz frequência do bloco, aumenta revisão.
  * $< 50\%$ nas últimas 10 questões: reduz dificuldade, aumenta repetição.
  * **Avanço de bloco:** $7\text{ dias no bloco}$ **OU** ($\ge 20\text{ questões}$ e $\ge 80\%$ de acerto). Prioridade ao tempo no piloto.
* **Retomada de sessão:** Salvar `sessao_atual` a cada resposta para retomar de onde parou se o navegador fechar.

### 3.2 Gamificação Individual (Sem Ranking ou Punição)
* **XP:** Acerto $+10$ · Erro $+2$ (participação) · Concluir missão $+20$ · Desafio diário $+15$ · Concluir bloco $+100$ · Bônus streak $+\min(\text{streak\_atual} \times 5, 50)$.
* **Curva de Níveis (1 a 10):** `[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4500]`.
* **Moedas:** $+5$ acerto · $+20$ missão · $+50$ bloco (apenas acumulam no MVP, sem loja).
* **Streak e Freeze:**
  * Dia válido = missão de 5 questões concluída (fuso horário local do device).
  * **1 freeze automático por semana** (segunda a domingo). Faltar 1 dia consome freeze e preserva streak (sem somar); faltar 2 dias na mesma semana reseta streak para `1`.
* **12 Badges:** `primeiro_passo`, `streak_3`, `streak_7`, `streak_14`, `streak_30`, `blocos_1_2`, `blocos_3_4`, `blocos_5_6`, `blocos_7_8`, `blocos_9_10`, `pratica_perfeita` (100% em $\ge 3$ questões), `sequencia_10` (10 acertos seguidos, dispara 1x).

---

## 4. Contrato de Dados (IndexedDB e Snapshot JSON)

### 4.1 Stores IndexedDB — PWA do Aluno (Dexie, em português)
* **Conteúdo (Estático/Versionado):**
  * `meta` (`key`): `app_version`, `content_version`, `turma_codigo`, `turma_nome`
  * `blocos` (`id`): `id`, `titulo`, `camada`, `descricao`, `ordem`
  * `questoes` (`id`): `id` (ex.: `b01_q01`), `bloco_id`, `tipo`, `dificuldade`, `contextualizada`, `habilidade_saeb`, `ativa`, `enunciado`, `alternativas[]`, `correta`, `explicacao_acerto`, `explicacao_erro`
  * `licoes` (`bloco_id`): `bloco_id`, `titulo`, `paragrafos[]`, `exemplos[]`
* **Progresso (Mutável/Exportável):**
  * `perfil` (`"aluno"`): `nome`, `ra`, `turma_codigo`, `criado_em`
  * `progresso` (`"aluno"`): `xp_total`, `nivel`, `moedas`, `streak_atual`, `streak_recorde`, `ultima_missao_data`, `freezes_usados_semana`, `semana_ref`
  * `sessoes` (`id`): `id`, `data`, `tipo`, `bloco_id`, `questoes_ids[]`, `xp_ganho`, `acertos`, `total`
  * `respostas` (`id`): `id`, `sessao_id`, `questao_id`, `bloco_id`, `correta`, `tempo_seg`, `respondida_em`
  * `dominio_bloco` (`bloco_id`): `acertos`, `total`, `percentual`, `ultima_atualizacao`
  * `fila_revisao` (`questao_id`): `questao_id`, `bloco_id`, `proxima_revisao`, `tentativas`, `ultima_resposta`
  * `badges` (`id`): `id`, `conquistada`, `conquistada_em`
  * `eventos` (`id`): `tipo`, `payload`, `data`
* **Sistema:**
  * `export_log` (`"aluno"`): `ultima_exportacao`, `total_exportacoes`
  * `config` (`key`): `lembrete_exportacao_dias` (7), `freeze_automatico` (true), `sessao_atual`

### 4.2 Snapshot de Exportação (`{turma}_{RA}_{AAAA-MM-DD}.json`)
```json
{
  "schema_version": "1.0",
  "exported_at": "2026-02-20T18:30:00-03:00",
  "app_version": "1.0.0",
  "content_version": "1.0.0",
  "turma_codigo": "9A-2026",
  "perfil": { "nome": "Nome do Aluno", "ra": "123456" },
  "progresso": {
    "xp_total": 120,
    "nivel": 2,
    "moedas": 45,
    "streak_atual": 4,
    "streak_recorde": 4,
    "freezes_usados_semana": 0,
    "semana_ref": "2026-W08"
  },
  "sessoes": [],
  "respostas": [],
  "dominio_bloco": [],
  "badges": [],
  "export_log": { "ultima_exportacao": "2026-02-20T18:30:00-03:00", "total_exportacoes": 1 }
}
```
*(Fallback obrigatório na UI: se o download de arquivo falhar no celular, exibir o JSON em textarea com botão "Copiar JSON").*

---

## 5. Arquitetura Modular para o Claude Code

**Regra de Ouro de Código:** Nenhum arquivo `.js` ou `.css` deve ultrapassar **~250–300 linhas**. Separação estrita entre UI (`ui/`), regras de negócio (`motor/`, `import/`, `analytics/`) e persistência (`db/`). Sem emojis nas interfaces.

### 5.1 Projeto 1: PWA do Aluno (`app-matematica-9ano/`)
```text
app-matematica-9ano/
├── index.html                    # Casca HTML, Dexie, container e barra inferior (3 abas)
├── manifest.webmanifest          # Configuração PWA standalone pt-BR
├── sw.js                         # Cache offline estático
├── vendor/
│   └── dexie.min.js              # Dependência local offline
├── css/
│   ├── tokens.css                # Variáveis de design e paleta acessível
│   ├── base.css                  # Reset e layout mobile-first
│   └── componentes.css           # Cards, barra XP, alternativas e modais
├── js/
│   ├── app.js                    # Boot, navigator.storage.persist(), seed e virada semanal
│   ├── router.js                 # Navegação: Onboarding, Home, Trilha, Lição, Prática, Resultado, Perfil
│   ├── db/
│   │   ├── schema.js             # Definição das stores IndexedDB
│   │   ├── seed.js               # Carga inicial/atualização de conteúdo sem apagar progresso
│   │   └── progress-repo.js      # CRUD de progresso, sessao_atual e eventos
│   ├── motor/
│   │   ├── session-builder.js    # Montagem da sessão (3+2 ou 5, ordem de dificuldade)
│   │   ├── adaptive.js           # Domínio por bloco, fila de revisão e avanço de bloco
│   │   ├── gamification.js       # Cálculo de XP, moedas, níveis e 12 badges
│   │   └── streak.js             # Fuso local, freeze semanal automático e reset
│   ├── ui/
│   │   ├── onboarding.js         # Aviso LGPD + cadastro (código turma, nome, RA)
│   │   ├── home.js               # Dashboard diário, missões e lembrete de exportação
│   │   ├── trilha.js             # Mapa dos 10 blocos e % de domínio
│   │   ├── licao.js              # Texto curto + 3 exemplos passo a passo
│   │   ├── pratica.js            # Fluxo da sessão, feedback imediato e persistência por questão
│   │   ├── resultado.js          # Resumo pós-sessão
│   │   └── perfil.js             # Badges, estatísticas e modal/fallback de exportação
│   ├── export/
│   │   └── snapshot.js           # Geração do JSON schema 1.0 e download/cópia
│   └── data/
│       ├── blocos.json           # Metadados dos 10 blocos
│       ├── licoes-lote1.json     # Lições dos blocos 1 a 3
│       └── questoes-lote1.json   # 45 questões dos blocos 1 a 3
```

### 5.2 Projeto 2: Painel do Professor (`painel-professor-9ano/`)
```text
painel-professor-9ano/
├── index.html                    # Casca desktop/tablet e 4 top tabs
├── css/
│   ├── tokens.css                # Cores semânticas (verde, amarelo, vermelho, cinza)
│   ├── layout.css                # Grid responsivo e cards de resumo
│   └── componentes.css           # Mini-mapa de blocos, dropzone, tabelas e modais
├── js/
│   ├── app.js                    # Boot, config padrão e rota inicial
│   ├── router.js                 # Alternância entre Painel, Importar, Exportar, Configurações
│   ├── db/
│   │   ├── schema.js             # Stores: config, alunos, progresso, sessoes, respostas, dominio_bloco, badges, export_log_aluno, import_log, import_snapshot
│   │   ├── teacher-repo.js       # Substituição atômica de snapshot por RA e consultas
│   │   └── backup.js             # Backup e restauração completa do IndexedDB do painel
│   ├── import/
│   │   ├── validator.js          # Validação em 4 níveis + avisos leves de adulteração
│   │   ├── batch-processor.js    # Importação em lote tolerante a falhas individuais
│   │   └── undo-manager.js       # Snapshot pré-lote e reversão ("Desfazer este lote")
│   ├── analytics/
│   │   ├── metrics.js            # Cálculos na leitura e filtros (início, 30d, personalizado)
│   │   └── risk-detector.js      # Risco: streak < 3 OU acerto < 50% OU sem exportar > 10d
│   ├── ui/
│   │   ├── tab-painel.js         # 4 cards, busca, filtros e tabela com mini-mapa
│   │   ├── modal-aluno.js        # Detalhe completo do RA selecionado
│   │   ├── tab-importar.js       # Drag-and-drop, relatório de lote e desfazer
│   │   ├── tab-exportar.js       # Filtros de relatório CSV e PDF
│   │   └── tab-config.js         # Código da turma, metas, backup e reset
│   └── reports/
│       ├── csv-exporter.js       # CSV com UTF-8 BOM (\uFEFF)
│       └── pdf-exporter.js       # PDF via jsPDF + autoTable (sem gráficos)
└── vendor/
    ├── dexie.min.js
    ├── jspdf.umd.min.js
    └── jspdf.plugin.autotable.min.js
```

---

## 6. Prompts Prontos para o Claude Code

### Prompt 1 — Iniciar PWA do Aluno
> *"Vamos construir o PWA local-first de Matemática (9º ano) seguindo a estrutura de pastas `app-matematica-9ano/` descrita na especificação. Regras obrigatórias: (1) cada arquivo `.js` e `.css` deve ter no máximo ~250–300 linhas, com responsabilidade única; (2) usar Dexie (`vendor/dexie.min.js`) com stores em português; (3) zero regras de negócio dentro de `js/ui/`; (4) todas as datas em fuso local do dispositivo; (5) sem emojis na interface. Comece criando `index.html`, `manifest.webmanifest`, `css/tokens.css`, `css/base.css` e `js/db/schema.js`."*

### Prompt 2 — Iniciar Painel do Professor
> *"Vamos construir o Painel do Professor (`painel-professor-9ano/`), web estática local-first sem servidor. Regras obrigatórias: (1) máximo ~250–300 linhas por arquivo; (2) Dexie para IndexedDB local; (3) UI em português (`pt-BR`), datas `DD/MM/AAAA`, números `pt-BR`, cores semânticas (verde, amarelo, vermelho, cinza) e zero emojis; (4) importação em lote tolerante a falhas individuais com validação em 4 níveis e desfazer lote via snapshot; (5) CSV com UTF-8 BOM e PDF via jsPDF + autoTable sem gráficos. Comece criando `index.html`, `css/tokens.css`, `css/layout.css`, `js/db/schema.js` e `js/import/validator.js`."*

---

## 7. Operação, QA e Materiais de Sala de Aula

### 7.1 Critério de Pronto (QA Pré-Piloto)
Testar em **2 aparelhos físicos** (incluindo Android de entrada) em Modo Avião:
* **Zero bugs críticos** em: instalação PWA, onboarding com código de turma, sessão (3+2 e 5 questões), retomada após fechar navegador, consumo de freeze semanal, exportação JSON e importação/CSV/PDF no painel.

### 7.2 Termo de Consentimento LGPD (Impresso — Semana -1)
> **TERMO DE CIÊNCIA E AUTORIZAÇÃO — PROJETO PILOTO DE MATEMÁTICA (9º ANO)**  
> Utilizaremos um aplicativo educativo gratuito desenvolvido pelo professor da turma para prática diária de exercícios no celular. O app funciona sem internet após o primeiro acesso e **não coleta e-mail, telefone, fotos ou localização**. Os dados (nome, RA e acertos) ficam salvos apenas no celular do estudante e são enviados semanalmente ao professor via arquivo exportado exclusivamente para acompanhamento pedagógico, sem rankings ou exposição pública.  
> Estudante: ___________________________ | Responsável: ___________________________  
> (  ) Autorizo a participação. Assinatura: ______________________ Data: ___/___/2026

### 7.3 Rituais Semanais e Marcos Go/No-Go
* **Segunda (5–10 min):** Abertura do bloco da semana + lembrar exportação.
* **Quarta (2–3 min):** Checkpoint rápido sem cobrança pública.
* **Sexta (5 min):** Ritual de exportação de dados + conversa individual com quem quebrou streak.
* **Fim de semana (30–45 min):** Importar JSONs no painel, checar os 5 indicadores e tomar **1 decisão** para a semana seguinte.
* **Marcos:** Fim Sem. 2 ($\ge 60\%$ onboarding e $\ge 40\%$ 1 missão) · Fim Sem. 5 ($\ge 50\%$ streak $\ge 3$ e $\ge 60\%$ exportando + survey rápido de 3 perguntas) · Fim Sem. 8 ($\ge 70\%$ em $\ge 6$ blocos + sinal de melhora).