# 09: Autenticação por E-mail/Senha e Controle de Acesso por Perfil (RBAC)

**What to build:** Implementar o módulo completo de autenticação por e-mail/CPF e senha (sem Gov.br) e controle de acesso baseado em perfil (`CANDIDATO` vs `BANCA_AVALIADORA`). O sistema deve exigir login para acessar as áreas restritas da Banca (`/banca/*`) e do Candidato (`/candidato/prova`, `/candidato/resultados`), mantendo sessão assinada via cookie HTTP-Only, vinculando automaticamente o candidato autenticado às suas inscrições, provas e espelho de avaliação, e oferecendo barra de sessão com opção de encerramento de sessão (Logout).

**Blocked by:** 08: Homologação, Espelho de Avaliação e Módulo de Recursos

**Status:** done

- [x] Modelo de domínio e token de sessão assinado (`SessaoUsuario`) com validação de permissões de rota por perfil (`CANDIDATO` e `BANCA_AVALIADORA`)
- [x] Persistência e seed de usuários da Banca Avaliadora (`usuarios_banca`) e autenticação unificada por e-mail/CPF e senha (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`)
- [x] Proteção de rotas via Middleware do Next.js (`src/middleware.ts`) redirecionando usuários não autenticados para `/login` e bloqueando acesso cruzado entre Candidato e Banca
- [x] Interface de Login e Cadastro Rápido (`/login`) com seleção de perfil (Candidato ou Banca Avaliadora), credenciais de demonstração visíveis para teste rápido e barra global de sessão com botão "Sair"
- [x] Vínculo automático da sessão do candidato logado nas páginas `/candidato/inscricao`, `/candidato/prova` e `/candidato/resultados`
- [x] Testes automatizados de domínio, API de autenticação/RBAC e componente de Login
