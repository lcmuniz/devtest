# Stack Tecnológica e Runners Multi-Linguagem

Para unificar o desenvolvimento frontend/backend e viabilizar o editor de código no navegador, usamos TypeScript com Next.js e PostgreSQL. Não há Redis: fila de execução e dados ficam no PostgreSQL (ver ADR 0002).

A execução em sandbox suporta TypeScript, Python e Java. Em vez de executar os frameworks de teste de cada linguagem (Vitest, pytest, JUnit), o runner monta um harness próprio e leve por linguagem: `describe`/`it`/`expect` em TypeScript, funções `test_*` em Python e métodos `@Test` em Java. Isso padroniza a contagem de testes públicos e ocultos e a medição de tempo e memória, sem instalar os frameworks no ambiente do runner. O TypeScript é transpilado com o compilador `typescript`; Python e Java exigem `python3` e `javac`/`java` no ambiente do runner.
