# 05: Resolução do Desafio no Web IDE com Feedback de Testes Públicos

**What to build:** Permitir que o Candidato inscrito em uma Trilha acesse o ambiente de prova durante o período regulamentar, visualize o enunciado formatado do Desafio e codifique sua solução diretamente em um editor web avançado (Monaco Editor / VS Code web) com autocomplete e syntax highlight. Ao clicar em "Testar Solução", o código é despachado para a fila do Runner e o frontend recebe, em tempo real via WebSocket ou SSE, o status da execução e o resultado detalhado dos testes públicos.

**Blocked by:** 02: Inscrição do Candidato com Cálculo Automático do Barema, 03: Cadastro e Gestão de Desafios com Suítes de Testes, 04: Runner Sandbox com Containers Efêmeros e Fila Assíncrona

**Status:** completed

- [x] Painel do Candidato listando os Desafios ativos da sua Trilha com cronômetro regressivo da prova
- [x] Integração do Monaco Editor no navegador com suporte à linguagem do Desafio (Java, TS ou Python) e pré-carregamento do código template
- [x] Botão "Testar Solução" que envia requisição assíncrona para execução exclusiva da suíte de testes públicos
- [x] Canal de comunicação em tempo real (WebSocket/SSE) que notifica o navegador sobre o progresso da fila e o retorno do Runner
- [x] Painel de saída no editor exibindo os logs de console, testes que passaram, testes que falharam (com diff de entrada/saída esperada) e tempo de execução
- [x] Salvamento automático periódico de rascunho de código local no navegador para evitar perdas acidentais de digitação
- [x] Testes automatizados do fluxo de teste interativo garantindo que nenhum teste oculto seja executado ou exposto nesta etapa
