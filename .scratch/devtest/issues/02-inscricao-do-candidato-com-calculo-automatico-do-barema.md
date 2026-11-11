# 02: Inscrição do Candidato com Cálculo Automático do Barema

**What to build:** Permitir que o Candidato crie sua conta na plataforma (validando e-mail, senha e formato de CPF), selecione um Processo Seletivo aberto e a Trilha de interesse, e preencha suas informações curriculares em formulário estruturado espelhado na matriz do Barema, anexando os PDFs comprobatórios obrigatórios. O sistema calcula imediatamente a pontuação preliminar provisória do Barema e disponibiliza o comprovante de inscrição ao candidato.

**Blocked by:** 01: Criação de Processo Seletivo com Trilhas e Matriz de Barema

**Status:** completed

- [x] Módulo de cadastro e login de Candidato com validação estrita de unicidade de CPF e e-mail
- [x] Listagem pública de Processos Seletivos abertos com indicação de prazos e Trilhas disponíveis
- [x] Formulário dinâmico de inscrição baseado nas regras de Barema cadastradas no Processo Seletivo
- [x] Upload obrigatório de documentos comprobatórios em formato PDF para cada critério que pontua
- [x] Cálculo automático e instantâneo da pontuação provisória do Barema, respeitando os tetos máximos por categoria
- [x] Exibição da tela de confirmação da inscrição com o resumo dos dados e o extrato preliminar de pontos do Barema
- [x] Testes automatizados cobrindo cadastro, submissão de formulário e precisão matemática do cálculo do Barema
