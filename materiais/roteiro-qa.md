# Roteiro de QA pré-piloto (seção 7.1)

Objetivo: **zero bugs críticos** em 2 aparelhos físicos, sendo 1 Android de entrada, com o celular em **modo avião**.
Preencha uma cópia desta tabela por aparelho. Marque `[x]` quando passar; se falhar, anote o que aconteceu na linha "Obs.".

- Aparelho 1: ______________ (modelo / Android) Navegador: ________
- Aparelho 2: ______________ (modelo / Android) Navegador: ________
- Endereço do app: ______________________  Data do teste: ___/___/2026

## A. Instalação e uso offline
- [ ] Abrir o endereço do app com internet e esperar carregar por completo.
- [ ] Instalar na tela inicial ("Adicionar à tela inicial" / "Instalar app"). O ícone aparece.
- [ ] Ligar o **modo avião**, fechar o app e abrir pelo ícone. Abre normalmente, sem tela de erro.
- [ ] Trilha, Lição e Perfil abrem sem internet.

## B. Cadastro
- [ ] Na primeira abertura aparece o aviso de dados e o campo de nome.
- [ ] Nome com menos de 3 letras mostra erro; sem marcar o aviso mostra erro.
- [ ] Cadastro correto leva à tela inicial com o primeiro nome do aluno.
- [ ] Perfil mostra o código do aluno (6 caracteres).

## C. Sessão de prática
- [ ] **1º dia de bloco** (aluno novo): missão com 5 questões do bloco atual.
- [ ] Feedback imediato correto/errado com explicação; XP e moedas sobem.
- [ ] Ao terminar, tela de resultado e streak = 1.
- [ ] **Dia normal** (outro dia, ver item E): missão de 5 questões, sendo 3 do bloco atual e 2 de revisão (posições 2 e 4).
- [ ] Desafio diário aparece uma vez por dia (+15 XP se acertar).

## D. Retomada
- [ ] Responder 2 questões, **fechar o navegador de verdade** (tirar dos apps recentes) e reabrir. A sessão continua na questão 3.
- [ ] Desligar e ligar o celular no meio da sessão. Continua de onde parou.

## E. Dias e freeze (mudar a data do aparelho; depois, voltar para automática)
- [ ] Faltar 1 dia na semana: streak mantida, freeze marcado como usado.
- [ ] Faltar 2 dias na mesma semana (segunda a domingo): streak volta para 1 na próxima missão.
- [ ] Após 7 dias no bloco, o app avança para o bloco seguinte.

## F. Exportação
- [ ] Perfil > Exportar baixa o arquivo `{turma}_{código}_{data}.json` (ver pasta Downloads).
- [ ] Se o download falhar: o app mostra o JSON em caixa de texto e o botão "Copiar JSON" copia tudo.
- [ ] O lembrete de exportação some depois de exportar.

## G. Painel do professor (computador ou tablet)
- [ ] Importar os JSONs dos 2 aparelhos (arrastar e soltar). O relatório do lote mostra os 2 como importados.
- [ ] Importar o mesmo arquivo de novo: aparece como "ignorado".
- [ ] "Desfazer este lote" volta ao estado anterior.
- [ ] Aba Painel mostra os 4 cards, a tabela e o mini-mapa de blocos.
- [ ] Clicar no nome abre o detalhe do aluno.
- [ ] Aba Exportar baixa CSV (abre no Excel com acentos corretos) e PDF (tabela legível).
- [ ] Configurações: salvar, fazer backup, restaurar e apagar dados funcionam.

## H. Conferência final
- [ ] Nenhuma tela travou, ficou em branco ou perdeu dados do aluno em nenhum teste acima.
- [ ] Textos legíveis no aparelho mais simples (sem cortes nem sobreposição).

**Bug crítico** = impede instalar, cadastrar, concluir a sessão, retomar, exportar ou importar, ou perde progresso.
Qualquer item crítico reprovado deve ser corrigido e o roteiro repetido naquele aparelho.

## Registro de bugs
| # | Aparelho | Item | O que aconteceu | Crítico? |
| :-: | :-- | :-: | :-- | :-: |
|   |   |   |   |   |
