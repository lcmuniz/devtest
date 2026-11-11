# 01: Criação de Processo Seletivo com Trilhas e Matriz de Barema

**What to build:** Permitir que membros da Banca Avaliadora criem e gerenciem Processos Seletivos na plataforma, definindo cronograma oficial de inscrição e provas, cadastrando as Trilhas técnicas disponíveis (ex: Backend Java, Frontend React, Dados Python) e configurando as regras da matriz do Barema Curricular (critérios objetivos, valores unitários por ano ou título e pontuação máxima admitida), persistindo os dados e expondo a listagem administrativa com validação ponta a ponta.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Interface administrativa permite criar novo Processo Seletivo com título, edital, data de início e término das inscrições e período de realização das provas
- [x] Possibilidade de vincular múltiplas Trilhas de conhecimento por Processo Seletivo
- [x] Parametrização da matriz do Barema Curricular com tipos pré-definidos (anos de experiência profissional comprovada, especialização, mestrado, doutorado e certificações oficiais) com pontuações unitárias e tetos individuais
- [x] Configuração do peso entre a prova técnica e o barema curricular na composição da nota final, além da nota de corte mínima eliminatória da prova prática
- [x] Validações de integridade garantem que datas sejam coerentes e que os pesos e tetos do barema somem valores válidos
- [x] Testes de ponta a ponta validam a criação, listagem e persistência de um Processo Seletivo completo com suas Trilhas e Barema
