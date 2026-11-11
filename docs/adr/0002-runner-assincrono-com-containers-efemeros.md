# Runner Assíncrono e Isolado do Restante da Aplicação

Para não travar a API web durante as execuções e isolar o código não confiável dos candidatos, a execução dos desafios é assíncrona. A API registra a submissão como job na tabela `runner_jobs` do PostgreSQL e devolve o `jobId`. A IDE acompanha o job por Server-Sent Events (`/api/runner/jobs/[jobId]/stream`). Cada job guarda o dono (`owner_id`), e só o dono ou a Banca leem o resultado.

O código do candidato roda em um serviço de runner separado (`RUNNER_URL`), que é a mesma imagem iniciada com `RUNNER_SERVICE=true`, sem credenciais do banco nem `AUTH_SECRET`, sem rota pública e com egress de rede bloqueado. A aplicação chama esse serviço autenticada por `RUNNER_TOKEN`. Dentro do serviço, cada execução é um subprocesso com variáveis de ambiente mínimas, timeout e limite de memória; com `RUNNER_USE_DOCKER=true`, cada execução roda num container efêmero sem rede.

Consequências: sem `RUNNER_URL` (desenvolvimento), o código roda no processo da aplicação e consegue ler os segredos dela; isso não deve ser usado em produção. A fila em PostgreSQL substitui o broker de mensagens (Redis/BullMQ) previsto inicialmente, para reduzir a infraestrutura; o processamento acontece na instância que recebeu a submissão.
