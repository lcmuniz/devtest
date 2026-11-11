# 10: Banco Global de Desafios por Linguagem e Composição / Sorteio de Prova no Processo Seletivo

**What to build:** Desacoplar o cadastro de Desafios de um Processo Seletivo específico, transformando `/banca/desafios` em um **Banco Global de Desafios** indexado por Linguagem de Programação (`java`, `python`, `typescript`). Na criação e gestão do Processo Seletivo (`/banca/processos-seletivos`), permitir que a Banca defina a quantidade desejada de desafios para cada linguagem, acione o **sorteio aleatório** diretamente da base de desafios respeitando as quantidades por linguagem, e possa **acrescentar ou remover desafios manualmente** escolhendo do Banco de Desafios tanto no formulário de criação quanto após o processo criado.

**Blocked by:** 09: Autenticação por E-mail/Senha e Controle de Acesso por Perfil (RBAC)

**Status:** closed

- [x] Atualizar o domínio de Desafio (`src/domain/desafio/desafio.ts`) para vincular desafios primariamente à `linguagem` (`java`, `typescript`, `python`) no Banco Global de Desafios, mantendo funções puras de sorteio aleatório por cota de linguagem (`sortearDesafiosPorLinguagem`) e adição/remoção manual sem duplicatas
- [x] Criar tabela associativa `processo_seletivo_desafios` (`processo_seletivo_id`, `desafio_id`, `ordem`) no PostgreSQL e métodos no repositório para vincular, listar, adicionar e remover desafios de um Processo Seletivo
- [x] Criar endpoints `GET / POST / PUT / DELETE` em `/api/processos-seletivos/[id]/desafios` (e suporte direto no `POST /api/processos-seletivos` via `desafiosIds` ou sorteio por cotas de linguagem)
- [x] Atualizar `/banca/desafios` (`DesafiosBancaView.tsx`) para operar como **Banco Global de Desafios por Linguagem**, com filtro por linguagem (`Todas`, `Java`, `Python`, `TypeScript`) e cadastro focado na linguagem
- [x] Atualizar `/banca/processos-seletivos` (`ProcessosSeletivosBanca.tsx`) para incluir o compositor de prova: definição de quantidades por linguagem (`Java`, `Python`, `TypeScript`), botão **"Sortear Aleatoriamente da Base"**, e seletor para **acrescentar ou remover desafios** manualmente (na criação e em processos já existentes)
- [x] Testes automatizados de domínio, API e interface validando o sorteio por linguagem e o gerenciamento manual de desafios anexados ao Processo Seletivo
