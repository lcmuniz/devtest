# DevTest

Plataforma de processos seletivos com avaliação técnica prática para desenvolvedores. O candidato se inscreve, declara o currículo num barema objetivo e resolve desafios de código numa Web IDE. A Banca avalia um ranking anonimizado e julga recursos.

## Funcionalidades

- **Processos seletivos**: trilhas, barema curricular, janelas de inscrição, prova e recursos.
- **Barema curricular**: pontuação preliminar calculada na inscrição; a Banca audita os comprovantes.
- **Web IDE**: o candidato roda os testes públicos enquanto resolve o desafio e faz uma submissão definitiva por desafio.
- **Runner multilinguagem**: executa TypeScript, Python e Java contra testes públicos e ocultos, com timeout e limite de memória.
- **Autoavaliação técnica**: nota de corretude, qualidade (análise estática) e desempenho, com nota de corte eliminatória.
- **Correção cega**: a Banca vê códigos anônimos (`CAND-1234`) até desmascarar os convocados.
- **Recursos**: o candidato consulta o espelho da avaliação e contesta; a Banca julga e o ranking é recalculado.
- **Relatórios**: ranking e recursos em CSV.

## Stack

Next.js 15 (App Router) · TypeScript · PostgreSQL · Tailwind CSS · Zod · Vitest

## Arquitetura

```
src/
  app/             páginas e rotas de API (Next.js)
  components/      telas da Banca e do Candidato
  domain/          regras de negócio puras (barema, ranking, recursos, runner, auth)
  infrastructure/  repositórios PostgreSQL, fila do runner, sandbox, e-mail
  middleware.ts    autenticação e perfil (Candidato / Banca) para páginas e /api
```

- A regra de negócio fica em `src/domain` e não depende de Next.js nem do banco.
- As submissões entram numa fila persistida no PostgreSQL. O progresso chega à IDE por Server-Sent Events.
- O código do candidato roda num serviço de runner separado e sem segredos (ver [Runner isolado](#runner-isolado)).
- Sessão em cookie `httpOnly` assinado com HMAC-SHA256. Senhas com scrypt.

Decisões de arquitetura em [`docs/adr`](docs/adr) e vocabulário do domínio em [`GLOSSARY.md`](GLOSSARY.md).

## Como rodar

Requisitos: Node.js 20+, Docker, e `python3` e `javac`/`java` no `PATH` para executar desafios dessas linguagens.

```bash
docker compose up -d          # PostgreSQL em localhost:5433
cp .env.example .env          # preencha AUTH_SECRET (openssl rand -hex 32)
npm install
npm run dev                   # http://localhost:3000
```

Não existe conta padrão. Para criar (ou redefinir a senha de) um membro da Banca:

```bash
BANCA_SENHA='uma-senha-forte' node --env-file=.env scripts/criar-usuario-banca.js banca@exemplo.com "Nome do Avaliador"
```

Candidatos se cadastram pela tela de login.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | conexão PostgreSQL |
| `AUTH_SECRET` | sim | chave HMAC da sessão |
| `BANCA_EMAIL`, `BANCA_SENHA` | não | credenciais usadas pelos scripts em `scripts/` |
| `RUNNER_URL`, `RUNNER_TOKEN` | em produção | endereço e token do serviço de runner |
| `RUNNER_SERVICE` | só no runner | `true` habilita `/api/runner/executar` |
| `RUNNER_USE_DOCKER` | não | `true` executa cada submissão em container |
| `API_HOST` | não | host usado pelos scripts em `scripts/` |
| `PROCESSO_SELETIVO_ID`, `TRILHA_ID` | não | processo e trilha dos desafios criados pelos seeds |

## Runner isolado

O código do candidato é não confiável. Em produção, rode a mesma imagem duas vezes:

| | Aplicação | Runner |
|---|---|---|
| Variáveis | `DATABASE_URL`, `AUTH_SECRET`, `RUNNER_URL=http://<runner>:3000`, `RUNNER_TOKEN` | `RUNNER_SERVICE=true`, `RUNNER_TOKEN` (e nada mais) |
| Rede | pública | sem rota pública; egress bloqueado (NetworkPolicy) |

Sem `RUNNER_URL`, o código roda dentro da própria aplicação e pode ler os segredos dela pelo `/proc`. Use esse modo só em desenvolvimento.

### Deploy do runner

O runner tem dois modos:

- **Subprocesso** (padrão): roda `node`, `python3` e `java` dentro do próprio container do runner. Cada instância executa uma submissão por vez e, ao fim, mata todos os processos que o candidato criou. Para mais vazão, aumente o número de réplicas.
- **Container por submissão** (`RUNNER_USE_DOCKER=true`): cada submissão roda num container descartável, sem rede, com sistema de arquivos somente leitura, usuário sem privilégio e limites de memória, CPU e processos. Execuções simultâneas ficam isoladas entre si.

#### OpenShift / Kubernetes

Use o modo subprocesso. Crie um Deployment com a mesma imagem e:

- variáveis `RUNNER_SERVICE=true` e `RUNNER_TOKEN` (de um Secret), sem `DATABASE_URL` nem `AUTH_SECRET`;
- um Service interno, sem Route nem Ingress;
- uma NetworkPolicy que bloqueia todo egress do runner e só aceita ingress vindo dos pods da aplicação.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: devtest-runner
spec:
  podSelector:
    matchLabels: { app: devtest-runner }
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: devtest }
      ports:
        - port: 3000
  egress: []
```

#### Dokploy / Docker Compose

O runner fica numa rede `internal`, sem acesso à internet nem a outros serviços:

```yaml
services:
  app:
    image: devtest
    environment:
      DATABASE_URL: ${DATABASE_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      RUNNER_URL: http://runner:3000
      RUNNER_TOKEN: ${RUNNER_TOKEN}
    networks: [default, runner]

  runner:
    image: devtest
    environment:
      RUNNER_SERVICE: "true"
      RUNNER_TOKEN: ${RUNNER_TOKEN}
    networks: [runner]

networks:
  runner:
    internal: true
```

Para o modo container por submissão, acrescente ao `runner`:

```yaml
    environment:
      RUNNER_USE_DOCKER: "true"
      TMPDIR: /var/lib/devtest-runner
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      # mesmo caminho no host e no runner: o docker monta o workspace a partir do host
      - /var/lib/devtest-runner:/var/lib/devtest-runner
```

A imagem do runner precisa do CLI `docker`, e o host precisa das imagens `node:20-alpine`, `python:3.12-alpine` e `eclipse-temurin:21-jdk-alpine`.

> **Atenção:** quem acessa o `docker.sock` tem root no host. Nesse modo o runner só pode rodar num host dedicado a ele, nunca no mesmo host do banco ou da aplicação. Para isolamento mais forte, instale o [gVisor](https://gvisor.dev) e adicione `--runtime=runsc` ao comando em `construirComandoDockerSandbox`.

## Testes

```bash
npm test            # Vitest; usa o PostgreSQL do docker compose (cria o banco de teste)
npm run typecheck
```

## Licença

[MIT](LICENSE)
