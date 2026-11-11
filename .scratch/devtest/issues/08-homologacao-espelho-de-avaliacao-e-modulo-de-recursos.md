# 08: Homologação, Espelho de Avaliação e Módulo de Recursos

**What to build:** Permitir que a Banca Avaliadora conclua formalmente a fase de avaliação, realize o desmascaramento dos dados dos candidatos convocados e publique os resultados oficiais. O sistema disponibiliza para cada Candidato o seu Espelho de Avaliação individual detalhado (discriminação de pontos do Barema homologado, desempenho e testes da prova prática) e abre a janela temporizada de Recursos, onde o candidato pode submeter contestação fundamentada que será analisada, deferida ou indeferida pela banca com registro de parecer técnico.

**Blocked by:** 07: Painel da Banca com Correção Cega e Ranking Consolidado

**Status:** done

- [x] Ação administrativa da Banca para encerrar a etapa anônima e revelar os dados cadastrais (nome, CPF, contatos) dos candidatos classificados e convocados
- [x] Geração automática do Espelho de Avaliação individual na área logada de cada Candidato, com detalhamento das pontuações obtidas em cada item do Barema e nos Desafios
- [x] Formulário para interposição de Recurso pelo candidato contra notas do Barema ou da prova prática, com prazo limite temporizado pelo edital
- [x] Painel da Banca para análise dos Recursos recebidos, com campos para registro de parecer técnico formal e ações de "Deferir" (com ajuste de pontuação) ou "Indeferir"
- [x] Recálculo e republicação automática do ranking final após o julgamento dos recursos
- [x] Testes de ponta a ponta validando o fluxo de desmascaramento, acesso restrito ao espelho do próprio candidato e ciclo completo de submissão e julgamento de recurso
