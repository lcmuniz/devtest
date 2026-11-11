# 03: Cadastro e Gestão de Desafios com Suítes de Testes

**What to build:** Permitir que a Banca Avaliadora cadastre Desafios de programação vinculados às Trilhas de um Processo Seletivo, especificando título, enunciado formatado (Markdown), linguagem de programação aceita (Java, TypeScript ou Python), código template inicial de partida, suíte de testes unitários públicos (visíveis para auxílio ao candidato) e suíte de testes unitários ocultos (usados para avaliação definitiva e verificação de casos de borda).

**Blocked by:** 01: Criação de Processo Seletivo com Trilhas e Matriz de Barema

**Status:** completed

- [x] Interface administrativa para criação e edição de Desafios vinculados a uma Trilha específica
- [x] Editor e visualizador de Markdown para o enunciado do problema e restrições da questão
- [x] Configuração do código template de assinatura da função/classe a ser preenchida pelo candidato
- [x] Upload ou edição direta de suítes de testes unitários públicos (exibidos com descrições no Web IDE)
- [x] Cadastro seguro de suítes de testes unitários ocultos de borda (nunca expostos no frontend aos candidatos)
- [x] Definição de limites técnicos por Desafio: tempo máximo de execução em segundos e teto de memória em megabytes
- [x] Testes garantem integridade das suítes de teste e validação de que os testes ocultos permanecem estritamente restritos à API interna
