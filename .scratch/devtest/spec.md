Status: ready-for-agent

# Especificação: DevTest, plataforma de seleção técnica

## Problem Statement

Órgãos públicos e empresas precisam selecionar desenvolvedores de software para programas de residência técnica em TI, processos seletivos simplificados (PSS) e contratos temporários de forma ágil, técnica e segura.

Atualmente, avaliações puramente curriculares favorecem candidatos com histórico acadêmico ou certificados formais, mas não comprovam capacidade real de entrega de software de qualidade, resolução de problemas e domínio prático de programação. Por outro lado, provas práticas tradicionais exigem correções manuais exaustivas por parte dos avaliadores, tornando o processo lento, sujeito a gargalos operacionais e vulnerável a questionamentos jurídicos de favorecimento ou parcialidade.

É preciso um sistema automatizado capaz de aplicar testes práticos de programação em ambiente seguro e calcular pontuações objetivas de currículo e de código, oferecendo à Banca Avaliadora um ranking transparente, impessoal e com correção cega.

## Solution

Uma plataforma web integrada de avaliação técnica e curricular para processos seletivos de TI.

A plataforma permite que a organização configure Processos Seletivos por Trilhas (Backend Java, Frontend React, Engenharia de Dados), associando matrizes de pontuação de títulos (Barema Curricular) e Desafios de programação com suítes de testes unitários.

O Candidato se inscreve, preenche seu currículo em formulário estruturado recebendo pontuação provisória imediata de Barema, e resolve os Desafios de programação diretamente em um editor web (Web IDE Monaco) com feedback de testes. Um serviço desacoplado de Runner executa o código do candidato em containers isolados e computa automaticamente notas de Corretude (testes públicos e ocultos), Qualidade (linter/complexidade) e Desempenho (tempo/memória).

A prova prática possui caráter eliminatório. Superada a nota de corte, o sistema pondera a pontuação técnica e o barema curricular gerando a Nota Final Consolidada. A Banca Avaliadora analisa os resultados por meio de Correção Cega (identificação anônima por códigos opacos), auditando os comprovantes de títulos apenas dos candidatos convocados. O sistema gera automaticamente o Espelho de Avaliação de cada candidato, calcula desempates e disponibiliza janela formal de Recursos.

## User Stories

1. As a membro da Banca Avaliadora, I want to criar um novo Processo Seletivo definindo prazos de inscrição, execução de provas e recursos, so that a organização possa abrir seleções técnicas oficiais conforme o cronograma do edital.
2. As a membro da Banca Avaliadora, I want to cadastrar Trilhas de conhecimento (ex: Backend Java, Fullstack TypeScript, Engenharia de Dados Python) dentro de um Processo Seletivo, so that candidatos possam se inscrever para perfis tecnológicos específicos.
3. As a membro da Banca Avaliadora, I want to parametrizar a matriz do Barema Curricular com pontuações máximas e unitárias (anos de experiência, pós-graduação, graduação, certificações), so that a pontuação curricular seja computada de forma 100% objetiva.
4. As a membro da Banca Avaliadora, I want to cadastrar Desafios de código associando enunciados, código template inicial, suítes de testes públicos e suítes de testes ocultos, so that o conhecimento prático dos candidatos seja testado em profundidade.
5. As a membro da Banca Avaliadora, I want to definir pesos para a Nota Final Consolidada (ex: 60% Prova Técnica e 40% Barema Curricular) e estabelecer uma nota de corte eliminatória para a prova técnica, so that candidatos sem habilidades reais de programação sejam desclassificados previamente.
6. As a membro da Banca Avaliadora, I want to visualizar o painel de resultados com Correção Cega ativada por padrão (identificadores anônimos como CAND-1024), so that a avaliação e escolha preliminar ocorram com total imparcialidade e compliance com o setor público.
7. As a membro da Banca Avaliadora, I want to filtrar e ordenar o ranking por Trilha, Nota Final Consolidada, nota técnica ou status de pontuação, so that possamos identificar rapidamente os melhores candidatos elegíveis.
8. As a membro da Banca Avaliadora, I want to inspecionar o código-fonte submetido, os logs de testes e as métricas de linter e desempenho de uma submissão anonimizada, so that a comissão técnica possa avaliar a qualidade do código com respaldo técnico.
9. As a membro da Banca Avaliadora, I want to auditar os documentos comprobatórios anexados pelos candidatos classificados dentro da nota de corte, confirmando ou glosando pontos do Barema, so that a pontuação curricular seja homologada com base em documentos idôneos.
10. As a membro da Banca Avaliadora, I want to realizar o encerramento da Correção Cega após a seleção da lista de finalistas, revelando os dados cadastrais (nome, CPF, contato) para convocação oficial.
11. As a membro da Banca Avaliadora, I want to analisar e deferir/indeferir Recursos interpostos pelos candidatos sobre notas do Espelho de Avaliação, registrando a motivação técnica da resposta.
12. As a Candidato, I want to me cadastrar na plataforma informando e-mail, senha e CPF válido, so that eu possa participar dos processos seletivos.
13. As a Candidato, I want to me inscrever em uma Trilha de um Processo Seletivo aberto, so that eu possa concorrer à oportunidade desejada.
14. As a Candidato, I want to preencher meu currículo em um formulário estruturado e anexar comprovantes em PDF (diplomas, certificados, declarações de trabalho), so that minha pontuação de títulos seja computada pelo sistema.
15. As a Candidato, I want to visualizar em tempo real a pontuação preliminar calculada pelo Barema Curricular ao concluir a inscrição, so that eu tenha previsibilidade sobre a minha pontuação declarada.
16. As a Candidato, I want to acessar a área de provas e resolver os Desafios de programação em um editor de código web integrado com realce de sintaxe e autocomplete, so that eu não precise configurar ambiente local complexo.
17. As a Candidato, I want to acionar a execução de testes públicos dentro do editor e receber feedback imediato de saída e aprovação, so that eu possa iterar sobre minha solução antes da submissão definitiva.
18. As a Candidato, I want to realizar a Submissão final do Desafio dentro do tempo limite da prova, so that meu código seja registrado para avaliação oficial contra a suíte completa de testes.
19. As a Candidato, I want to acessar meu Espelho de Avaliação ao final da etapa, visualizando a discriminação de pontos obtidos em cada questão, testes aprovados e cálculo do Barema, so that eu tenha total transparência sobre o meu desempenho.
20. As a Candidato, I want to interpor Recurso formal contra notas da prova técnica ou do barema dentro do prazo regulamentar, informando justificativa fundamentada, so that minha contestação seja julgada pela Banca Avaliadora.
21. As a operador do sistema, I want to que a execução do código de candidatos ocorra em containers efêmeros e sem acesso à rede externa, so that a infraestrutura fique protegida contra código malicioso ou vazamento de dados.

## Implementation Decisions

### 1. Módulos e Arquitetura do Sistema
A aplicação é dividida em três subsistemas desacoplados:
- **Web App & Gateway (Next.js/TypeScript)**: Interface administrativa da Banca Avaliadora, portal do Candidato com Monaco Editor e API REST/tRPC interna.
- **Fila de Execução & Broker (Redis + BullMQ)**: Buffer resiliente que recebe submissões de código, enfileira tarefas de compilação/teste e gerencia estados (`queued`, `running`, `completed`, `failed`).
- **Runner Worker Service**: Processo em background que consome mensagens da fila, inicializa containers Docker descartáveis com volumes somente-leitura dos testes, coleta métricas e publica os resultados no banco de dados e via WebSocket/SSE.

### 2. Autoavaliação Técnica e Ponderação de Código
A Autoavaliação Técnica é computada pelo Runner aplicando a fórmula de 3 pilares:
- **Corretude (70% da nota do desafio)**:
  `NotaCorretude = (TestesPublicosPassados * 0.30 + TestesOcultosPassados * 0.70) / TotalTestes * 70`
- **Qualidade de Código (15% da nota do desafio)**:
  Análise estática automatizada executada dentro do container (ex: ESLint para TS, Checkstyle/PMD para Java, Flake8/Pylint para Python). Penalidades são subtraídas progressivamente a partir de regras críticas de complexidade ciclomática e violações de padrões de projeto.
- **Desempenho (15% da nota do desafio)**:
  Medição de tempo de CPU e consumo de memória RAM do processo contra baselines pré-definidos no Desafio.

### 3. Matriz do Barema Curricular
O Barema é armazenado como uma estrutura de critérios pontuáveis parametrizada por Processo Seletivo:
- Cada critério define: `tipo` (tempo de experiência, formação, certificação), `valorPorItemOuAno`, `limiteMaximoPontos` e obrigatoriedade de anexo.
- O Candidato preenche os dados no formulário e envia os PDFs comprobatórios. O sistema calcula a `pontuacaoProvisoriaBarema`.
- Durante a fase de auditoria, a Banca Avaliadora atribui `aprovado` ou `rejeitado` a cada item, gerando a `pontuacaoHomologadaBarema`.

### 4. Nota Final Consolidada e Caráter Eliminatório
- A prova técnica tem caráter **eliminatório**: o candidato precisa atingir a nota mínima de corte (definida no edital, padrão 50% dos testes) para ser classificado.
- Candidatos abaixo do corte recebem status `desclassificado_nota_corte` e não têm o Barema somado.
- Para os aprovados, o sistema calcula a **Nota Final Consolidada**:
  `NotaFinal = (NotaTecnica * PesoTecnico + NotaBarema * PesoBarema) / (PesoTecnico + PesoBarema)`

### 5. Correção Cega (Double-Blind Review)
- Na visualização da Banca Avaliadora, todos os dados identificadores do Candidato são ocultados. A tabela e o ranking expõem apenas `idAnonimo` (hash opaco único por processo seletivo, ex: `CAND-4091`), notas parciais, métricas de código e links para o código anônimo.
- Os dados reais do candidato só são desmascarados na interface após o comando formal de "Concluir Avaliação e Revelar Convocados" emitido pela Banca.

### 6. Contrato do Runner Sandbox
O payload enviado ao container efêmero segue o contrato:
- `language`: `"java"` | `"typescript"` | `"python"`
- `sourceCode`: string com o código submetido pelo candidato
- `testHarness`: string com os testes unitários (públicos e ocultos)
- `limits`: `{ timeoutSeconds: 10, memoryLimitMb: 512, cpuQuota: 1.0, network: "none" }`
O retorno para o banco de dados e WebSocket é estruturado como:
- `status`: `"SUCCESS"` | `"TEST_FAILURE"` | `"TIMEOUT"` | `"OUT_OF_MEMORY"` | `"COMPILE_ERROR"`
- `executionTimeMs`: integer
- `memoryPeakKb`: integer
- `testResults`: array de `{ testName, status, durationMs, failureMessage }` (mensagens de erro de testes ocultos são ocultadas do candidato e visíveis apenas à banca)
- `linterScore`: pontuação calculada de qualidade

## Testing Decisions

### O que constitui um bom teste
- Testes devem verificar exclusivamente o **comportamento observável externo** através dos seams principais (API Boundary e Runner Boundary), sem depender de estruturas internas de classes, ORMs ou métodos privados.
- Testes devem garantir determinismo na apuração das notas e segurança absoluta no sandbox de execução.

### Seams a serem testados
1. **API / Core Domain Seam**:
   - Teste ponta a ponta do cálculo do Barema Curricular (inscrição com diferentes combinações de anos e títulos atingindo ou não o teto).
   - Teste da aplicação da nota de corte eliminatória da prova prática: candidatos abaixo da nota de corte não devem compor ranking classificatório.
   - Teste da ponderação da Nota Final Consolidada e desempate automático.
   - Teste de integridade da Correção Cega: verificar que endpoints acessados por membros da banca em modo cego não vazam nome, e-mail ou CPF em nenhum campo da resposta JSON.
2. **Runner Sandbox Seam**:
   - Teste de execução bem-sucedida de código correto em Java, TypeScript e Python.
   - Teste de código com erro de compilação/sintaxe retornando erro formatado.
   - Teste de segurança contra loops infinitos (timeout de CPU atingido sem travar o worker).
   - Teste de isolamento de rede: tentativa de realizar requisições HTTP externas deve falhar imediatamente.

## Out of Scope

- Integração ao vivo com o sistema de autenticação Gov.br (deixada como adaptador plugável para v1.1).
- Servidor Git dedicado (Gitea/GitLab) para submissões em repositório (projeto prático complexo da Fase 2 fica mapeado para v1.1; o MVP foca nos Desafios no Web IDE).
- Transmissão de vídeo ou monitoramento de webcam por IA (proctoring biométrico invasivo).
- Emissão de folhas de pagamento ou contratação jurídica pós-processo seletivo.

## Further Notes

- Todas as decisões arquiteturais estão formalizadas em:
  - [`docs/adr/0001-autoavaliacao-ponderada-e-correcao-cega.md`](docs/adr/0001-autoavaliacao-ponderada-e-correcao-cega.md)
  - [`docs/adr/0002-runner-assincrono-com-containers-efemeros.md`](docs/adr/0002-runner-assincrono-com-containers-efemeros.md)
  - [`docs/adr/0003-stack-tecnologica-e-runners-multilinguagem.md`](docs/adr/0003-stack-tecnologica-e-runners-multilinguagem.md)
- O vocabulário oficial segue o [`GLOSSARY.md`](GLOSSARY.md).
