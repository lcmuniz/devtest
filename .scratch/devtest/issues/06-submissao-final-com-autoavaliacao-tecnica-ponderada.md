# 06: Submissão Final com Autoavaliação Técnica Ponderada

**What to build:** Permitir que o Candidato submeta sua solução definitiva para o Desafio dentro do tempo limite da prova. A plataforma bloqueia edições posteriores, despacha o código para execução contra a suíte completa de testes (públicos e testes ocultos de borda), coleta métricas de qualidade (linter) e desempenho (CPU e memória), computa a nota da Autoavaliação Técnica aplicando a fórmula de 3 pilares (70% corretude, 15% qualidade, 15% desempenho) e registra o status de atendimento à nota de corte eliminatória.

**Blocked by:** 05: Resolução do Desafio no Web IDE com Feedback de Testes Públicos

**Status:** completed

- [x] Ação de "Submissão Definitiva" com modal de confirmação e bloqueio imediato contra novas submissões após o prazo
- [x] Enfileiramento da submissão para execução pelo Runner com a suíte integral (testes públicos + testes ocultos de borda)
- [x] Cálculo matemático da Autoavaliação Técnica:
  - 70% Corretude Funcional (ponderando 30% para testes públicos e 70% para testes ocultos de borda)
  - 15% Qualidade de Código (análise estática automatizada / linter score)
  - 15% Desempenho (tempo de CPU e consumo de memória contra benchmarks do desafio)
- [x] Aplicação da regra de nota de corte eliminatória da prova prática (ex: desclassificação automática para acerto inferior ao limite configurado)
- [x] Persistência segura do snapshot do código-fonte, logs brutos de execução e notas calculadas
- [x] Testes ponta a ponta validando o cálculo ponderado da nota técnica, a aplicação da nota de corte e o bloqueio de edições posteriores
