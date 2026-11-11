# 04: Runner Sandbox com Containers Efêmeros e Fila Assíncrona

**What to build:** Implementar o serviço worker isolado de Runner que consome jobs de compilação e teste de uma fila assíncrona (Redis/BullMQ), sobe containers Docker efêmeros descartáveis em ambiente blindado (sem acesso à rede externa, com limites estritos de CPU e memória RAM), compila e executa o código contra a suíte de testes unitários em Java (JUnit), TypeScript (Vitest) e Python (pytest), roda ferramentas de análise estática/linter e retorna métricas estruturadas de execução (tempo de CPU em ms, pico de memória em KB, testes aprovados/reprovados e score de qualidade).

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Serviço de fila assíncrona configurado com Redis e BullMQ para enfileiramento resiliente de submissões
- [x] Orquestração de containers Docker efêmeros com destruição forçada ao término da execução
- [x] Isolamento de segurança: flag de rede desligada (`network: none`), usuário não-root, sistema de arquivos read-only exceto diretório temporário, quota de CPU e limite de RAM (ex: 512MB)
- [x] Suporte aos runtimes oficiais: Java 17/21 com JUnit, Node.js/TypeScript com Vitest e Python 3.11+ com pytest
- [x] Execução de análise estática de código automatizada (linter) no container gerando pontuação de qualidade
- [x] Tratamento confiável de loops infinitos, exaustão de memória e erros de compilação retornando status correspondente (`TIMEOUT`, `OUT_OF_MEMORY`, `COMPILE_ERROR`)
- [x] Suíte de testes unitários e de integração validando o comportamento do Runner com códigos válidos, códigos maliciosos e códigos com erro em cada uma das três linguagens
