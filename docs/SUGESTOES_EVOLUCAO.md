# DevTest: Sugestões de Evolução e Roadmap de Novas Funcionalidades

Este documento consolida oportunidades e propostas de funcionalidades para evolução da plataforma **DevTest**, visando processos seletivos públicos e corporativos de alta criticidade e escala.

---

## 1. Integridade, Anti-Fraude e Prova Monitorada (Proctoring Ético)

### 1.1 Detecção de Plágio e Similaridade de Código (MOSS / AST Similarity)
- **Objetivo:** Garantir a imparcialidade e idoneidade técnica da seleção, respaldando juridicamente a Banca Avaliadora contra fraudes e soluções idênticas copiadas de terceiros ou entre candidatos vizinhos.
- **Como funciona:**
  - O sistema gera a Árvore Sintática Abstrata (AST) do código submetido em cada desafio e compara a estrutura lógica entre todos os candidatos da mesma trilha.
  - Variações superficiais (renomeação de variáveis, funções e inversão de condicionais simples) são normalizadas.
  - A Banca recebe um alerta com **Índice de Similaridade (%)** e visualizador lado a lado das soluções suspeitas.

### 1.2 Telemetria da Sessão de Prova (Anti-Cheat & Timeline)
- **Objetivo:** Inibir o uso indevido de ferramentas externas sem autorização e registrar o histórico de construção da solução.
- **Funcionalidades:**
  - Registro de eventos do navegador: perda de foco na janela (*blur/tab switching*), contagem de saídas da aba e tempo fora da prova.
  - Detecção de colagens massivas repentinas (*paste bursts* vs digitação incremental humana).
  - Linha do tempo visual no painel da banca permitindo ao examinador assistir ou reproduzir a evolução temporal do código submetido.

---

## 2. Desafios Multi-Arquivo e Arquitetura de Software

### 2.1 Projetos Práticos com Árvore de Diretórios (Multi-file IDE)
- **Objetivo:** Avaliar a maturidade arquitetural e organização de código do candidato além de algoritmos em arquivo único.
- **Funcionalidades:**
  - Navegador de arquivos integrado ao Monaco Editor, permitindo criar múltiplos arquivos (`controller.ts`, `service.ts`, `repository.ts`, etc.).
  - Capacidade de estruturar camadas e aplicar princípios de *Clean Architecture* e *SOLID*.
  - Runner com suporte a compilação e execução de projetos modulares completos.

---

## 3. Inteligência Artificial para a Banca Avaliadora (AI Co-pilot)

### 3.1 Parecer Técnico Automatizado de Qualidade de Código
- **Objetivo:** Auxiliar a comissão de avaliação na correção e auditoria de centenas de submissões.
- **Funcionalidades:**
  - Análise semântica apontando:
    - Estimativa de complexidade assintótica de tempo e espaço ($O(n)$, $O(n^2)$);
    - Risco de vulnerabilidades de segurança (ex: injeção de parâmetros, consumo desordenado de memória);
    - Nível de manutenibilidade, Clean Code e tratamento robusto de exceções.
  - Rascunho inicial de fundamentação técnica para subsidiar os auditores.

### 3.2 Validação Automatizada de Comprovantes do Barema (OCR de Diplomas e Certidões)
- **Objetivo:** Acelerar a auditoria de títulos declarados no Barema Curricular.
- **Funcionalidades:**
  - Leitura ótica (OCR) de PDFs e imagens anexadas pelos candidatos.
  - Extração automatizada de carga horária, data de conclusão, nome do curso e instituição emissora.
  - Pré-checagem automática contra os critérios do edital, sugerindo ao auditor a validação ou pré-glosa do item.

---

## 4. Gestão do Ciclo de Convocação, Segunda Chamada e Termo de Posse

### 4.1 Aceite Formal e Declínio de Convocação
- **Objetivo:** Automatizar o fluxo pós-homologação diretamente pelo portal do candidato.
- **Funcionalidades:**
  - O candidato convocado visualiza os termos e prazos e pode registrar seu **Aceite Formal** ou **Declínio de Vaga** motivado.
  - Relógio de contagem regressiva para expiração do prazo de manifestação.

### 4.2 Segunda Chamada Automática (Remanejamento de Vagas)
- **Objetivo:** Eliminar a necessidade de controle manual em planilhas para convocar substitutos.
- **Funcionalidades:**
  - Se um candidato convocado declinar ou se o prazo regulamentar expirar sem resposta, o sistema convoca automaticamente o próximo classificado da lista de espera.
  - Atualização do painel da banca com o status de cada vaga preenchida.

### 4.3 Assinatura Eletrônica do Termo de Posse / Contrato de Residência
- **Objetivo:** Concluir a contratação ou admissão de forma 100% digital.
- **Funcionalidades:**
  - Geração automática do termo de compromisso ou minuta contratual preenchida com os dados do candidato e edital.
  - Assinatura eletrônica na plataforma com registro de IP, data/hora e hash de integridade do documento.

---

## 5. Criação Dinâmica e Fuzzing de Desafios

### 5.1 Fuzzing e Geração Automática de Casos de Teste Extremos
- **Objetivo:** Testar a robustez real das soluções submetidas contra entradas não triviais.
- **Funcionalidades:**
  - Gerador automatizado de casos de borda: números gigantes, valores nulos, strings com caracteres especiais/Unicode, arrays vazios e cenários de concorrência.
  - Execução desses cenários nos testes ocultos do Runner para avaliar a tolerância a falhas.

### 5.2 Profiling Gráfico de Recursos no Sandbox
- **Objetivo:** Avaliar a eficiência do código além da resposta binária (passou/falhou).
- **Funcionalidades:**
  - Gráfico de consumo de memória (Heap Memory Allocation) e uso de CPU ao longo da execução dos testes.
  - Comparativo visual da eficiência da solução do candidato em relação à solução de referência do edital.

---

## Tabela de Priorização Sugerida

| Proposta | Impacto | Complexidade | Recomendação |
| :--- | :---: | :---: | :---: |
| **Detecção de Plágio / Similaridade (AST)** | Alto | Média | **Fase 1 (Imediata)** |
| **Ciclo de Segunda Chamada e Aceite de Vagas** | Alto | Baixa | **Fase 1 (Imediata)** |
| **Telemetria e Anti-Cheat no Web IDE** | Médio | Baixa | **Fase 2** |
| **Projetos Multi-Arquivo no Web IDE** | Alto | Alta | **Fase 2** |
| **AI Co-pilot para a Banca (Pareceres)** | Médio | Média | **Fase 3** |
| **OCR de Comprovantes do Barema** | Médio | Média | **Fase 3** |
