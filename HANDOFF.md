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
| `painel-professor-9ano/` | Só `vendor/` (Dexie, jsPDF, autoTable). Nenhum código. |
| Testes automatizados | `app-matematica-9ano/tests/e2e-aluno.mjs` (Playwright, ponta a ponta). Unitários de `js/motor/`: ainda não. |

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
2. Testes unitários dos módulos puros de `js/motor/` com `node --test` (streak, adaptive, gamification, session-builder; não importam Dexie).
3. Painel do professor (`painel-professor-9ano/`), seguindo a seção 5.2 e o Prompt 2 da especificação. Precisa ler o snapshot gerado por `js/export/snapshot.js`.
4. QA da seção 7.1 (modo avião, Android de entrada).

## Observações sobre o conteúdo

- Quando o conteúdo mudar: subir `content_version` em `blocos.json` e `VERSAO` em `sw.js`.
- **Lições liberadas desde o início:** a trilha mostra o botão "Lição" em todos os blocos. A prática (missões) continua presa ao bloco da semana, que avança em 7 dias ou com 20 questões e 80% de acerto.
- Ao pedir conteúdo novo a outra IA, exigir que a resposta certa varie entre A, B, C e D (ela tende a colocar tudo em A).

## Git

Branch de trabalho: `ccr-ab0b94ca-7p89bs`. Não há servidor nem build; qualquer hospedagem estática (ex.: GitHub Pages) serve.
