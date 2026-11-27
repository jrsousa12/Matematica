# HANDOFF — App de Matemática 9º Ano

Leia isto antes de mexer no código. A especificação completa (v3.0) está em `CLAUDE.md` e é a fonte de verdade;
aqui está só o que foi feito, as decisões tomadas e o que falta.

## Estado atual

| Parte | Situação |
| :--- | :--- |
| `app-matematica-9ano/` (PWA do aluno) | **Funciona.** Teste no navegador (Chromium, 390 px) sem erros: cadastro, missão de 5 questões, retomada após recarregar, resultado, lição, service worker. Também testados (`tests/e2e-aluno.mjs`, 15 verificações, todas passando): desafio diário, exportação (download, Copiar JSON, `export_log`), freeze/streak e avanço de bloco por tempo, simulando datas. |
| Conteúdo (`content_version` 1.1.1) | **Completo: 10 lições + 150 questões** em 3 lotes (`lote1` blocos 1–3, `lote2` blocos 4–6, `lote3` blocos 7–10). Escritos por outra IA; contas conferidas uma a uma. Alternativas reembaralhadas: a letra com 3 (em vez de 4) gira entre os blocos, então o total das 150 questões fica A 38, B 38, C 37, D 37. Frações convertidas de "5/8" para `<span class="frac">`. |
| `materiais/avaliacao-diagnostica.md` | Avaliação diagnóstica Pré (Versão A) e Pós (Versão B), 20 questões SAEB, com gabarito. Gabarito conferido e redistribuído (5 A, 5 B, 5 C e 5 D em cada versão; "Todos/Todas..." fica sempre em D). É material de papel, o app não usa. |
| Ícones PNG do PWA | Gerados a partir de `icons/icone.svg`. |
| `painel-professor-9ano/` | **Partes 3.1 a 3.6 prontas e testadas:** casca com 4 abas, validador em 4 níveis com avisos leves, importação em lote com desfazer, aba Painel (4 cards, busca, filtros, tabela com mini-mapa de blocos e detecção de risco) e modal de detalhe do aluno (clique no nome), aba Exportar com relatório CSV e PDF. Falta: configurações/backup (3.7). A aba Configurações ainda mostra só um aviso. |
| Testes automatizados | `app-matematica-9ano/tests/e2e-aluno.mjs` (Playwright, ponta a ponta). Unitários (`tests/motor-*.test.mjs`, `node --test`, 52 testes passando): streak, gamification, adaptive e session-builder. Falta cobrir `session-runner`, `cadastro` e `resumos` (usam o repositório/Dexie). |

## Motores (ferramentas/)

- `verificar.mjs`: regra dos 300 linhas, `ARQUIVOS` do `sw.js` e testes unitários. Exceções de tamanho ficam na constante `EXCECOES`.
- `gerar-snapshots.mjs` + `simulador.mjs`: alunos fictícios (nomes "Aluno Teste NN", RA 900001 em diante) simulados desde 16/02/2026 com as regras reais de streak, XP, domínio e badges. Mesma semente gera os mesmos arquivos. Em `problemas/`: JSON quebrado, arquivo que não é snapshot, schema 2.0, sem RA, tipo errado, turma diferente e 3 casos de aviso leve (XP ×10, data futura, domínio 100% incoerente com as respostas).
- Ainda não criado: conferidor de conteúdo dos lotes (fazer quando houver conteúdo novo ou correção).

## Regras obrigatórias (da especificação)

- Máximo de ~250–300 linhas por arquivo `.js`/`.css`, responsabilidade única.
- Zero regra de negócio em `js/ui/` (a UI só renderiza e chama funções de `js/motor/`).
- Dexie global (`vendor/dexie.min.js`), stores em português. Sem build, sem npm: ES modules puros.
- Datas sempre no fuso local do dispositivo (usar `js/util/datas.js`, nunca `toISOString()` para dia).
- Sem emojis na interface. Textos de UI em português com acentos.

## Mapa do PWA do aluno

```
js/app.js            boot: storage.persist, SW, seed, rotinaDiaria, router
js/router.js         rotas por hash: #/onboarding #/home #/trilha #/licao/:id #/pratica #/resultado #/perfil[/exportar]
js/util/datas.js     hoje(), somarDias, diferencaDias, semanaIso, isoLocal (com offset -03:00)
js/util/ids.js       novoId(), embaralhar()
js/db/schema.js      stores Dexie + progressoInicial() + CONFIG_PADRAO
js/db/seed.js        carrega js/data/*.json só quando content_version muda (não apaga progresso)
js/db/progress-repo.js  todo acesso ao banco (gravarResposta e gravarConclusao são transações)
js/motor/streak.js        freeze semanal e streak (funções puras)
js/motor/gamification.js  XP, moedas, níveis, 12 badges (puras)
js/motor/adaptive.js      domínio, fila de revisão, modo adaptativo, avanço de bloco (puras)
js/motor/session-builder.js  planejarSessao, nivelAlvo, escolherProxima, escolherDesafio (puras)
js/motor/session-runner.js   orquestra: iniciarMissao, responder, concluirSessao, rotinaDiaria (usa o repo)
js/motor/cadastro.js      validação de turma/nome/RA e criação do perfil
js/motor/resumos.js       view-models para home, trilha e perfil
js/export/snapshot.js     JSON schema 1.0, download, navigator.share, copiar
js/ui/*.js                telas (comum.js = esc, toast, modal)
sw.js                     cache offline; lista ARQUIVOS precisa conter todo arquivo novo
```

## Decisões tomadas (não estão explícitas na especificação)

- **Registros únicos** (`perfil`, `progresso`, `export_log`) usam `key: "aluno"`. `meta` e `config` usam `{ key, value }`.
- **Campos extras em `progresso`:** `bloco_atual`, `bloco_inicio`, `blocos_concluidos[]`, `dias_congelados[]`, `sequencia_acertos`. O snapshot exporta `bloco_atual`, `blocos_concluidos` e `ultima_missao_data` além do schema 1.0 (o validador do painel deve aceitar campos extras).
- **Sessão escolhe a próxima questão em tempo real** (não é pré-montada), porque a dificuldade depende do acerto anterior. `sessao_atual` guarda `fontes[]` (`atual`/`revisao`), `itens[]` respondidos e `corrente` (questão exibida). É salva a cada resposta.
- **Curva de dificuldade:** alvo `[1,2,3,2,1]`; se acertou, sobe no máximo +1; se errou, não sobe. Modo reforço (<50% nas últimas 10, mínimo 5 respostas) limita a "média" e prioriza erradas. Modo dominado (≥80%) usa 2 atuais + 3 revisões.
- **"1º dia de bloco"** = `bloco_inicio === hoje` ou nenhuma resposta do bloco antes de hoje → 5 questões do bloco atual. Sem bloco anterior disponível, também 5 do atual.
- **Avanço de bloco:** checado no boot e ao fim de cada sessão. Por tempo, o novo `bloco_inicio` = anterior + 7 dias (aluno ausente acompanha o ritmo da turma, pode avançar vários blocos). +100 XP/+50 moedas só se o aluno respondeu algo no bloco. Só avança se o próximo bloco tem questões.
- **Streak/freeze:** no boot, cada dia perdido até ontem consome o freeze da sua semana ISO; se não houver, `streak_atual = 0` e a próxima missão recomeça em 1. Bônus de streak só na 1ª missão do dia; +20 de missão em toda missão.
- **Desafio diário:** 1 por dia (`config.desafio_data`), questão difícil do bloco atual ou anteriores; +15 XP só se acertar. Não conta para streak.
- **Código da turma** vem de `blocos.json` (`turma.codigo`); o onboarding só aceita esse código.
- **Lembrete de exportação:** a partir de 7 dias desde a última exportação (ou desde o cadastro).

## Formato do conteúdo (o que `seed.js` espera)

`js/data/blocos.json`
```json
{
  "content_version": "1.0.0",
  "turma": { "codigo": "9A-2026", "nome": "9º Ano A" },
  "lotes": ["lote1"],
  "blocos": [
    { "id": 1, "ordem": 1, "titulo": "Adição e subtração com naturais", "camada": "1 — Fundamentos", "descricao": "..." }
  ]
}
```
Liste os 10 blocos (os sem questões aparecem como "Em breve"). Para publicar um lote novo: criar `licoes-loteN.json` e `questoes-loteN.json`, adicionar `"loteN"` em `lotes`, subir `content_version`, adicionar os arquivos em `sw.js` e mudar `VERSAO` lá.

`js/data/licoes-lote1.json` (array)
```json
[{
  "bloco_id": 1,
  "titulo": "Adição e subtração com naturais",
  "paragrafos": ["até 40 palavras cada, 3 a 4 parágrafos"],
  "exemplos": [
    { "titulo": "Exemplo 1 — ...", "enunciado": "...", "passos": ["Passo 1: ...", "Resposta: ..."] },
    { "titulo": "Exemplo 2 — ...", "enunciado": "...", "passos": ["..."] },
    { "titulo": "Exemplo 3 — ... (SAEB)", "enunciado": "...", "passos": ["..."] }
  ]
}]
```
Um passo que começa com "Resposta:" aparece em negrito. Também é aceito o formato antigo (`tipo` + campo `resposta`).

`js/data/questoes-lote1.json` (array, 15 por bloco: 5 `facil`, 6 `media`, 4 `dificil`)
```json
[{
  "id": "b01_q01", "bloco_id": 1, "tipo": "objetiva",
  "dificuldade": "facil", "contextualizada": false, "habilidade_saeb": "D19", "ativa": true,
  "enunciado": "Quanto é 2.345 + 1.432?",
  "alternativas": ["3.677", "3.777", "913", "3.787"],
  "correta": "B",
  "explicacao_acerto": "...", "explicacao_erro": "..."
}]
```
- `correta` é a **letra** (A–D); `alternativas` em ordem A–D, sem embaralhamento no app. Se o conteúdo vier com `correta` igual ao texto da alternativa, converta para a letra.
- **Varie a posição da correta** (≈ 4/4/4/3 por bloco). O Lote 1 veio com quase tudo em A e foi reembaralhado.
- `tipo` é ignorado pelo app (o Lote 1 usa `"multipla_escolha"`).
- HTML simples permitido: `<sup>`, `<sub>`, frações `<span class="frac"><span>3</span><span>4</span></span>`. Usar `−` (U+2212), `×`, `÷`.
- Distratores = erros reais do 9º ano. Variar a posição da correta.
- Proporção contextualizada: blocos 1–5 com 7–8 de 15; blocos 6–10 com 9 de 15.

## Próximos passos (em ordem)

1. ~~Testar o restante do app do aluno~~ (feito: `tests/e2e-aluno.mjs`). Não coberto: avanço de bloco por 20 questões e 80%, modo reforço/dominado.
2. ~~Testes unitários dos módulos puros de `js/motor/`~~ (feito: `tests/motor-*.test.mjs`).
3. Painel do professor (`painel-professor-9ano/`), seção 5.2 e Prompt 2. Dividido em partes (o painel precisa ler o snapshot de `js/export/snapshot.js`):
   - ~~3.1 Casca~~ (feito).
   - ~~3.2 Validador: `validator.js` + `avisos.js`, testes em `tests/validator.test.mjs`~~ (feito).
   - ~~3.3 Importação em lote: `teacher-repo.js`, `batch-processor.js`, `undo-manager.js`, `tab-importar.js`~~ (feito).
   - ~~3.4 Aba Painel: `metrics.js`, `risk-detector.js`, `tab-painel.js`~~ (feito).
   - ~~3.5 Detalhe do aluno: `detalhe-aluno.js`, `modal-aluno.js`, estilos em `css/componentes.css`~~ (feito).
   - ~~3.6 Relatórios: `dados-relatorio.js`, `csv-exporter.js`, `pdf-exporter.js`, `tab-exportar.js`~~ (feito).
   - 3.7 Configurações: `backup.js`, `tab-config.js`.
4. QA da seção 7.1 (modo avião, Android de entrada).

## Decisões do painel

- Banco `painel_matematica_9ano`. Tabelas de dados do aluno usam chave composta com o RA (`[ra+id]`, `[ra+bloco_id]`), para não colidir entre alunos.
- Configuração padrão (`config`): turma `9A-2026`, meta 3 sessões/semana, meta de streak 3, risco com acerto < 50% e > 10 dias sem exportar.
- **Validador (4 níveis):** 1 JSON válido; 2 estrutura do schema 1.0; 3 tipos e valores; 4 turma igual à configurada. Falhou um nível, os seguintes não rodam. Campos extras são aceitos. Avisos leves (não bloqueiam): data de exportação no futuro (tolerância 24 h), XP total maior que sessões + bônus de bloco (100) + desafio (15/dia) + 10, domínio do bloco diferente das respostas.
- **Importação:** por RA vale a exportação mais recente, inclusive contra o que já está no banco (igual ou mais antiga é "ignorada"). Arquivos ignorados também mostram seus avisos. Desfazer vale só para o **último** lote (a foto dos anteriores é descartada); lote que não mudou nada não pode ser desfeito.
- **Cards da aba Painel (escolha minha, a especificação só diz "4 cards"):** alunos ativos (missão nos 7 dias até o fim do período), sessões por semana por aluno ativo (meta 3), acerto médio do período, alunos em risco. Só sessões `missao` contam como prática; o `desafio` não.
- **Risco:** streak < meta (3) OU acerto no período < 50% OU > 10 dias sem exportar. Situação: 0 motivos "Em dia" (verde), 1 "Atenção" (amarelo), 2 ou mais "Em risco" (vermelho). O card "em risco" conta Atenção + Em risco. Sem respostas no período não gera motivo de acerto. Mini-mapa: verde >= 80%, amarelo 60 a 79%, vermelho < 60%, cinza sem dados. Faixas de uso (alta/média/baixa) já calculadas em `metrics.js`, ainda sem coluna na tela.
- Atenção: o critério de streak sozinho marca muitos alunos (17 de 24 nos dados de teste). Se o professor achar alarmista, ajustar `meta_streak` em Configurações (parte 3.7) ou mudar a regra.
- **Detalhe do aluno (3.5):** abre ao clicar no nome na tabela (`<dialog>`; fecha com Esc, botão Fechar ou clique fora). Mostra situação e motivos de risco, faixa de uso (alta/média/baixa adesão), XP, nível, moedas, streak, recorde, bloco atual, sessões, acerto no período (segue o filtro da tabela), tempo médio por questão, exportações, domínio dos 10 blocos em barras, 10 últimas sessões e os 12 badges. Cálculo em `js/analytics/detalhe-aluno.js` (testes em `tests/detalhe-aluno.test.mjs`). A faixa de uso ainda não tem coluna na tabela; só aparece no detalhe.
- **Relatórios (3.6):** 13 colunas (código, nome, situação, motivos, faixa de uso, sessões por semana, streak, XP, nível, acerto no período, bloco atual, última exportação, dias sem exportar). Filtros: período (início, 30 dias, personalizado) e situação (todos, atenção e em risco, só atenção, só em dia). CSV com BOM, separador `;` e proteção contra fórmula do Excel (texto iniciado por `=`, `+`, `-`, `@` ganha apóstrofo). PDF A4 paisagem, jsPDF carregado só ao clicar (`vendor/`), célula Situação colorida. Arquivos `relatorio_{turma}_{AAAA-MM-DD}.csv|pdf`. Testes: `tests/relatorios.test.mjs` e e2e.
- O painel não tem PWA nem service worker. Para testar: `cd painel-professor-9ano && python3 -m http.server 8081`.

## Observações sobre o conteúdo

- Quando o conteúdo mudar: subir `content_version` em `blocos.json` e `VERSAO` em `sw.js`.
- **Lições liberadas desde o início:** a trilha mostra o botão "Lição" em todos os blocos. A prática (missões) continua presa ao bloco da semana, que avança em 7 dias ou com 20 questões e 80% de acerto.
- Ao pedir conteúdo novo a outra IA, exigir que a resposta certa varie entre A, B, C e D (ela tende a colocar tudo em A).

## Ideias futuras

- **RA (Registro do Aluno):** desligado por enquanto, por decisão do professor. Hoje o app não pede o RA no cadastro; ele cria sozinho um código aleatório de 6 caracteres (ex.: `K7Q2M9`, sem I, L, O, 0, 1), guardado em `perfil.ra`, que identifica o aluno no painel (aparece como "Código"). O contrato de dados (schema 1.0) não mudou: o campo `perfil.ra` continua existindo. Para religar: `EXIGIR_RA = true` em `app-matematica-9ano/js/motor/cadastro.js`, devolver o campo no `js/ui/onboarding.js` (label, input, erro e `ra: form.ra.value`), voltar o texto "nome, RA e acertos" do aviso e a linha do perfil, e trocar "Código" por "RA" nas telas do painel. Alunos já cadastrados com RA continuam funcionando (o valor antigo vira o código). Atenção: o termo LGPD da especificação (seção 7.2) cita o RA; ajustar o texto impresso enquanto estiver desligado.

## Git

Branch de trabalho: `ccr-ab0b94ca-7p89bs`. Não há servidor nem build; qualquer hospedagem estática (ex.: GitHub Pages) serve.
