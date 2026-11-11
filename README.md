# DevTest

A hiring platform for developer selection processes with hands-on technical assessment. Candidates register, declare their résumé against an objective scoring rubric (*barema*) and solve coding challenges in a web IDE. The evaluation board (*Banca*) reviews an anonymized ranking and rules on appeals.

The user interface and the domain vocabulary in the code are in Brazilian Portuguese. See [`GLOSSARY.md`](GLOSSARY.md) for the terms.

## Features

- **Selection processes**: tracks, résumé rubric, and windows for registration, exam and appeals.
- **Résumé rubric**: a preliminary score is computed at registration; the board audits the supporting documents.
- **Web IDE**: candidates run the public tests while solving a challenge and make one final submission per challenge.
- **Multi-language runner**: runs TypeScript, Python and Java against public and hidden tests, with timeout and memory limits.
- **Automated technical grading**: scores for correctness, quality (static analysis) and performance, with an eliminatory cutoff.
- **Blind review**: the board sees anonymous codes (`CAND-1234`) until it unmasks the shortlisted candidates.
- **Appeals**: candidates view their grading report and contest it; the board rules and the ranking is recalculated.
- **Reports**: ranking and appeals in CSV.

## Stack

Next.js 15 (App Router) · TypeScript · PostgreSQL · Tailwind CSS · Zod · Vitest

## Architecture

```
src/
  app/             pages and API routes (Next.js)
  components/      board and candidate screens
  domain/          pure business rules (rubric, ranking, appeals, runner, auth)
  infrastructure/  PostgreSQL repositories, runner queue, sandbox, e-mail
  middleware.ts    authentication and role (Candidate / Board) for pages and /api
```

- Business rules live in `src/domain` and depend on neither Next.js nor the database.
- Submissions go into a queue persisted in PostgreSQL. Progress reaches the IDE through Server-Sent Events.
- Candidate code runs in a separate runner service that holds no secrets (see [Isolated runner](#isolated-runner)).
- Session in an `httpOnly` cookie signed with HMAC-SHA256. Passwords hashed with scrypt.

Architecture decisions are in [`docs/adr`](docs/adr).

## Getting started

Requirements: Node.js 20+, Docker, plus `python3` and `javac`/`java` on the `PATH` to run challenges in those languages.

```bash
docker compose up -d          # PostgreSQL on localhost:5433
cp .env.example .env          # fill in AUTH_SECRET (openssl rand -hex 32)
npm install
npm run dev                   # http://localhost:3000
```

There is no default account. To create a board member (or reset their password):

```bash
BANCA_SENHA='a-strong-password' node --env-file=.env scripts/criar-usuario-banca.js board@example.com "Reviewer Name"
```

Candidates sign up from the login screen.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection |
| `AUTH_SECRET` | yes | session HMAC key |
| `BANCA_EMAIL`, `BANCA_SENHA` | no | board credentials used by the scripts in `scripts/` |
| `RUNNER_URL`, `RUNNER_TOKEN` | in production | runner service address and token |
| `RUNNER_SERVICE` | runner only | `true` enables `/api/runner/executar` |
| `RUNNER_USE_DOCKER` | no | `true` runs each submission in a container |
| `API_HOST` | no | host used by the scripts in `scripts/` |
| `PROCESSO_SELETIVO_ID`, `TRILHA_ID` | no | selection process and track for the challenges created by the seed scripts |

## Isolated runner

Candidate code is untrusted. In production, run the same image twice:

| | Application | Runner |
|---|---|---|
| Variables | `DATABASE_URL`, `AUTH_SECRET`, `RUNNER_URL=http://<runner>:3000`, `RUNNER_TOKEN` | `RUNNER_SERVICE=true`, `RUNNER_TOKEN` (nothing else) |
| Network | public | no public route; egress blocked (NetworkPolicy) |

Without `RUNNER_URL`, candidate code runs inside the application itself and can read its secrets through `/proc`. Use that mode for development only.

### Deploying the runner

The runner has two modes:

- **Subprocess** (default): runs `node`, `python3` and `java` inside the runner container itself. Each instance runs one submission at a time and, when it finishes, kills every process the candidate started. Add replicas for more throughput.
- **Container per submission** (`RUNNER_USE_DOCKER=true`): each submission runs in a throwaway container with no network, a read-only filesystem, an unprivileged user and memory, CPU and process limits. Concurrent runs are isolated from each other.

#### OpenShift / Kubernetes

Use subprocess mode. Create a Deployment from the same image with:

- the variables `RUNNER_SERVICE=true` and `RUNNER_TOKEN` (from a Secret), without `DATABASE_URL` or `AUTH_SECRET`;
- an internal Service, with no Route or Ingress;
- a NetworkPolicy that blocks all runner egress and only accepts ingress from the application pods.

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

The runner sits on an `internal` network, with no access to the internet or to other services:

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

For container-per-submission mode, add to `runner`:

```yaml
    environment:
      RUNNER_USE_DOCKER: "true"
      TMPDIR: /var/lib/devtest-runner
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      # same path on the host and in the runner: docker mounts the workspace from the host
      - /var/lib/devtest-runner:/var/lib/devtest-runner
```

The runner image needs the `docker` CLI, and the host needs the `node:20-alpine`, `python:3.12-alpine` and `eclipse-temurin:21-jdk-alpine` images.

> **Warning:** access to `docker.sock` means root on the host. In this mode, run the runner only on a host dedicated to it, never on the same host as the database or the application. For stronger isolation, install [gVisor](https://gvisor.dev) and add `--runtime=runsc` to the command in `construirComandoDockerSandbox`.

## Tests

```bash
npm test            # Vitest; uses the docker compose PostgreSQL (creates the test database)
npm run typecheck
```

## License

[MIT](LICENSE)
