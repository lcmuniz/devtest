# 07: Painel da Banca com Correção Cega e Ranking Consolidado

**What to build:** Disponibilizar à Banca Avaliadora um painel analítico com Correção Cega (Double-Blind Review) ativa por padrão, onde cada candidato é identificado unicamente por um código alfanumérico anônimo (ex: `CAND-1024`). A banca visualiza o ranking ordenado pela Nota Final Consolidada (ponderando a prova técnica prática e o barema curricular dos candidatos aprovados no corte), inspeciona o código e logs de testes anonimizados, e realiza a auditoria documental dos anexos de títulos apenas dos candidatos convocados.

**Blocked by:** 06: Submissão Final com Autoavaliação Técnica Ponderada

**Status:** done

- [x] Painel da Banca com tabela de classificação e modo de Correção Cega (dados pessoais como nome, e-mail e CPF 100% ocultos, exibindo apenas identificadores anônimos gerados)
- [x] Cálculo da Nota Final Consolidada ponderada: `(NotaTecnica * PesoTecnico + NotaBarema * PesoBarema) / (PesoTecnico + PesoBarema)` exclusivamente para candidatos aprovados no corte da prova prática
- [x] Filtros avançados de listagem por Trilha, faixa de pontuação, status de aprovação e ordenação por critérios de desempate
- [x] Visualizador de código-fonte anônimo com métricas de execução do Runner (tempo, memória, falhas de testes e pontuação de linter)
- [x] Módulo de auditoria documental para a banca: visualização dos PDFs anexados no Barema com ações de validar ou glosar pontos declarados pelo candidato
- [x] Testes automatizados garantem que as APIs do painel anônimo não vazam dados pessoais e que a fórmula da Nota Final Consolidada é rigorosamente precisa
