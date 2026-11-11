const https = require("https");

// Uso: node --env-file=.env scripts/<este-arquivo>.js (requer API_HOST, BANCA_EMAIL e BANCA_SENHA)
// PROCESSO_SELETIVO_ID e TRILHA_ID são opcionais; sem eles, os desafios vão para o banco global.
const { API_HOST, BANCA_EMAIL, BANCA_SENHA, PROCESSO_SELETIVO_ID = "", TRILHA_ID = "" } =
  process.env;
if (!API_HOST || !BANCA_EMAIL || !BANCA_SENHA) {
  console.error("Defina API_HOST, BANCA_EMAIL e BANCA_SENHA.");
  process.exit(1);
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: API_HOST,
        port: 443,
        ...options,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const desafiosPleno = [
  {
    titulo: "Fusão de Intervalos de Prazos Fiscais Sobrepostos",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Em auditorias de conformidade, órgãos auditados enviam relatórios contendo diversos intervalos temporais de fiscalização, licenças ambientais ou suspensões de prazos. Devido a prorrogações parciais, muitos desses períodos se sobrepõem ou são adjacentes, tornando os relatórios redundantes.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<int[]> mesclarIntervalos(List<int[]> intervalos)
\`\`\`

### Regras de Negócio:
1. Cada intervalo é representado por um array de 2 inteiros: \`[inicio, fim]\`, onde \`inicio <= fim\`.
2. A lista de entrada pode conter intervalos em qualquer ordem.
3. Se dois intervalos se sobrepuserem ou se tocarem (ou seja, \`intervaloA[1] >= intervaloB[0]\` após ordenação), eles devem ser fundidos em um único intervalo \`[min(inicio), max(fim)]\`.
4. Os intervalos resultantes devem ser retornados em ordem crescente de início (\`inicio\`).
5. Se a lista de entrada for \`null\` ou vazia, retorne uma lista vazia (\`new ArrayList<>()\`).

### Exemplo:
- Entrada: \`[[1, 3], [8, 10], [2, 6], [15, 18]]\`
- Processamento:
  - Ordenação: \`[1, 3]\`, \`[2, 6]\`, \`[8, 10]\`, \`[15, 18]\`
  - Fusão: \`[1, 3]\` e \`[2, 6]\` se sobrepõem -> \`[1, 6]\`
- Saída: \`[[1, 6], [8, 10], [15, 18]]\``,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static List<int[]> mesclarIntervalos(List<int[]> intervalos) {
        if (intervalos == null || intervalos.isEmpty()) {
            return new ArrayList<>();
        }

        List<int[]> ordenados = new ArrayList<>(intervalos);
        ordenados.sort(Comparator.comparingInt(a -> a[0]));

        List<int[]> resultado = new ArrayList<>();
        int[] atual = ordenados.get(0);

        for (int i = 1; i < ordenados.size(); i++) {
            int[] proximo = ordenados.get(i);
            if (atual[1] >= proximo[0]) {
                atual[1] = Math.max(atual[1], proximo[1]);
            } else {
                resultado.add(atual);
                atual = proximo;
            }
        }
        resultado.add(atual);
        return resultado;
    }
}
`,
    suiteTestesPublicos: `@Test void deveMesclarIntervalosSobrepostos() {
    List<int[]> entrada = Arrays.asList(
        new int[]{1, 3}, new int[]{2, 6}, new int[]{8, 10}, new int[]{15, 18}
    );
    List<int[]> res = Solution.mesclarIntervalos(entrada);
    assertEquals(3, res.size());
    assertEquals(1, res.get(0)[0]);
    assertEquals(6, res.get(0)[1]);
    assertEquals(8, res.get(1)[0]);
    assertEquals(10, res.get(1)[1]);
}

@Test void deveMesclarIntervalosAdjacentes() {
    List<int[]> entrada = Arrays.asList(new int[]{1, 4}, new int[]{4, 5});
    List<int[]> res = Solution.mesclarIntervalos(entrada);
    assertEquals(1, res.size());
    assertEquals(1, res.get(0)[0]);
    assertEquals(5, res.get(0)[1]);
}
`,
    suiteTestesOcultos: `@Test void deveLidarComListaVaziaOuNula() {
    assertTrue(Solution.mesclarIntervalos(null).isEmpty());
    assertTrue(Solution.mesclarIntervalos(new ArrayList<>()).isEmpty());
}

@Test void deveLidarComIntervaloTotalmenteContido() {
    List<int[]> entrada = Arrays.asList(new int[]{1, 10}, new int[]{2, 5}, new int[]{3, 7});
    List<int[]> res = Solution.mesclarIntervalos(entrada);
    assertEquals(1, res.size());
    assertEquals(1, res.get(0)[0]);
    assertEquals(10, res.get(0)[1]);
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Simulador de Rate Limiting com Algoritmo Token Bucket",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O portal de transparência e o sistema de submissões de provas do concurso sofrem picos de requisições. Para evitar degradação de serviço sem descartar tráfego legítimo em rajadas moderadas, utiliza-se o algoritmo **Token Bucket**.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<Boolean> simularTokenBucket(int capacidade, int taxaPorSegundo, int[] timestampsSegundos)
\`\`\`

### Regras do Algoritmo:
1. O balde inicia **cheio** com \`capacidade\` tokens no instante do primeiro evento (ou no instante 0).
2. A cada segundo transcorrido desde a última requisição, são reabastecidos \`taxaPorSegundo\` tokens por segundo decorrido (sem nunca ultrapassar a \`capacidade\` máxima).
   - \`tokensAdicionados = (tempoAtual - ultimoTempo) * taxaPorSegundo\`
   - \`tokensAtuais = Math.min(capacidade, tokensAtuais + tokensAdicionados)\`
3. Quando chega uma requisição no segundo \`t\`:
   - Atualiza-se o saldo de tokens de acordo com o tempo decorrido.
   - Se houver pelo menos 1 token disponível, a requisição é aceita (\`true\`), o saldo de tokens é decrementado em 1, e \`ultimoTempo\` passa a ser \`t\`.
   - Se não houver tokens (\`tokens < 1\`), a requisição é rejeitada (\`false\`), os tokens permanecem inalterados e \`ultimoTempo\` passa a ser \`t\`.
4. Os \`timestampsSegundos\` são inteiros em ordem não-decrescente. Múltiplas requisições no mesmo segundo devem processar o saldo sequencialmente.
5. Se \`timestampsSegundos\` for nulo ou vazio, retorne uma lista vazia.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static List<Boolean> simularTokenBucket(int capacidade, int taxaPorSegundo, int[] timestampsSegundos) {
        if (timestampsSegundos == null || timestampsSegundos.length == 0) {
            return new ArrayList<>();
        }

        List<Boolean> resultado = new ArrayList<>();
        int tokens = capacidade;
        int ultimoTempo = timestampsSegundos[0];

        for (int t : timestampsSegundos) {
            int deltaTempo = t - ultimoTempo;
            if (deltaTempo > 0) {
                tokens = Math.min(capacidade, tokens + (deltaTempo * taxaPorSegundo));
                ultimoTempo = t;
            }

            if (tokens >= 1) {
                resultado.add(true);
                tokens--;
            } else {
                resultado.add(false);
            }
        }

        return resultado;
    }
}
`,
    suiteTestesPublicos: `@Test void devePermitirRajadaInicialAteCapacidade() {
    // Capacidade 3, taxa 1 token/seg, 4 requisições no segundo 0
    int[] ts = new int[]{0, 0, 0, 0};
    List<Boolean> res = Solution.simularTokenBucket(3, 1, ts);
    assertEquals(4, res.size());
    assertTrue(res.get(0));
    assertTrue(res.get(1));
    assertTrue(res.get(2));
    assertFalse(res.get(3)); // 4ª requisição rejeitada por falta de tokens
}

@Test void deveRecarregarTokensComPassarDoTempo() {
    // Capacidade 2, taxa 1 token/seg
    // seg 0: consome 2
    // seg 2: passaram 2 segundos -> recarrega 2 tokens
    int[] ts = new int[]{0, 0, 2, 2};
    List<Boolean> res = Solution.simularTokenBucket(2, 1, ts);
    assertTrue(res.get(0));
    assertTrue(res.get(1));
    assertTrue(res.get(2));
    assertTrue(res.get(3));
}
`,
    suiteTestesOcultos: `@Test void deveNaoUltrapassarCapacidadeAposLongoPeriodo() {
    int[] ts = new int[]{0, 100, 100, 100};
    List<Boolean> res = Solution.simularTokenBucket(2, 5, ts);
    assertTrue(res.get(0));
    assertTrue(res.get(1));
    assertTrue(res.get(2));
    assertFalse(res.get(3)); // Capacidade é 2, mesmo após 100s só guarda 2 tokens
}

@Test void deveRetornarListaVaziaParaEntradaNulaOuVazia() {
    assertTrue(Solution.simularTokenBucket(5, 1, null).isEmpty());
    assertTrue(Solution.simularTokenBucket(5, 1, new int[0]).isEmpty());
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Reconciliação Contábil Bidirecional de Transações",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Na auditoria de prestação de contas, é preciso confrontar a relação de pagamentos emitidos pelo sistema de contabilidade governamental com os extratos bancários das contas conveniadas, apontando todas as divergências existentes em ambos os lados.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<String> reconciliarTransacoes(List<String> sistemaInterno, List<String> extratoBancario)
\`\`\`

### Formato dos Registros:
Cada string possui o formato: \`"CODIGO_DOCUMENTO:VALOR_CENTAVOS"\` (ex: \`"OB-2026-001:150050"\`).

### Regras de Negócio:
1. Uma transação é considerada conciliada quando existe exatamente a mesma chave \`"CODIGO:VALOR"\` em ambos os lados.
2. Cada ocorrência casa com apenas **uma** ocorrência no lado oposto (respeitando duplicidades legítimas).
3. O retorno deve conter exclusivamente as pendências formatadas como:
   - \`"[FALTA_NO_BANCO] CODIGO:VALOR"\`: para registros que constam no sistema interno mas não foram localizados no extrato bancário.
   - \`"[NAO_IDENTIFICADO] CODIGO:VALOR"\`: para registros que constam no extrato bancário mas não têm lançamento no sistema interno.
4. A lista resultante deve ser retornada em ordem alfabética da string formatada.
5. Se não houver divergências, retorne uma lista vazia. Se qualquer uma das listas for nula, trate-a como vazia.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static List<String> reconciliarTransacoes(List<String> sistemaInterno, List<String> extratoBancario) {
        List<String> resultado = new ArrayList<>();
        Map<String, Integer> freqInterno = new HashMap<>();
        Map<String, Integer> freqBanco = new HashMap<>();

        if (sistemaInterno != null) {
            for (String item : sistemaInterno) {
                if (item != null && !item.trim().isEmpty()) {
                    freqInterno.put(item.trim(), freqInterno.getOrDefault(item.trim(), 0) + 1);
                }
            }
        }

        if (extratoBancario != null) {
            for (String item : extratoBancario) {
                if (item != null && !item.trim().isEmpty()) {
                    freqBanco.put(item.trim(), freqBanco.getOrDefault(item.trim(), 0) + 1);
                }
            }
        }

        for (Map.Entry<String, Integer> entry : freqInterno.entrySet()) {
            String item = entry.getKey();
            int qtdInterno = entry.getValue();
            int qtdBanco = freqBanco.getOrDefault(item, 0);
            if (qtdInterno > qtdBanco) {
                for (int i = 0; i < qtdInterno - qtdBanco; i++) {
                    resultado.add("[FALTA_NO_BANCO] " + item);
                }
            }
        }

        for (Map.Entry<String, Integer> entry : freqBanco.entrySet()) {
            String item = entry.getKey();
            int qtdBanco = entry.getValue();
            int qtdInterno = freqInterno.getOrDefault(item, 0);
            if (qtdBanco > qtdInterno) {
                for (int i = 0; i < qtdBanco - qtdInterno; i++) {
                    resultado.add("[NAO_IDENTIFICADO] " + item);
                }
            }
        }

        Collections.sort(resultado);
        return resultado;
    }
}
`,
    suiteTestesPublicos: `@Test void deveIdentificarDivergenciasNosDoisLados() {
    List<String> interno = Arrays.asList("OB-01:100", "OB-02:200");
    List<String> banco = Arrays.asList("OB-01:100", "TAR-99:50");
    List<String> res = Solution.reconciliarTransacoes(interno, banco);
    assertEquals(2, res.size());
    assertEquals("[FALTA_NO_BANCO] OB-02:200", res.get(0));
    assertEquals("[NAO_IDENTIFICADO] TAR-99:50", res.get(1));
}

@Test void deveCasarRegistrosIdenticosComSucesso() {
    List<String> interno = Arrays.asList("OB-01:100", "OB-02:200");
    List<String> banco = Arrays.asList("OB-02:200", "OB-01:100");
    List<String> res = Solution.reconciliarTransacoes(interno, banco);
    assertTrue(res.isEmpty());
}
`,
    suiteTestesOcultos: `@Test void deveTratarDuplicidadesParciais() {
    List<String> interno = Arrays.asList("OB-01:100", "OB-01:100", "OB-01:100");
    List<String> banco = Arrays.asList("OB-01:100");
    List<String> res = Solution.reconciliarTransacoes(interno, banco);
    assertEquals(2, res.size());
    assertEquals("[FALTA_NO_BANCO] OB-01:100", res.get(0));
    assertEquals("[FALTA_NO_BANCO] OB-01:100", res.get(1));
}

@Test void deveLidarComListasNulasOuVazias() {
    List<String> res = Solution.reconciliarTransacoes(null, Arrays.asList("CHQ-10:500"));
    assertEquals(1, res.size());
    assertEquals("[NAO_IDENTIFICADO] CHQ-10:500", res.get(0));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Implementação de Cache com Política de Descarte LRU",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Para otimizar o acesso às regras de validação de editais e resultados de provas sem sobrecarregar o banco de dados relacional, é necessário um mecanismo de cache em memória com controle de capacidade estrito via política **LRU** (Least Recently Used).

## Especificação da Tarefa
Implemente a classe \`Solution\` contendo a estrutura de cache:
\`\`\`java
public class Solution {
    public Solution(int capacidade) { ... }
    public int get(int chave) { ... }
    public void put(int chave, int valor) { ... }
}
\`\`\`

### Regras de Negócio:
1. O construtor recebe \`capacidade > 0\`. Se a capacidade for menor ou igual a 0, lance \`IllegalArgumentException\`.
2. \`get(int chave)\`: Retorna o valor associado à chave se existir no cache; caso contrário, retorna \`-1\`. O acesso bem-sucedido a uma chave marca-a como **recentemente utilizada**.
3. \`put(int chave, int valor)\`: Atualiza o valor se a chave já existir, ou insere o par chave-valor se não existir.
   - Tanto a atualização quanto a inserção marcam a chave como **recentemente utilizada**.
   - Se a chave for nova e o cache atingir a \`capacidade\`, deve ser **removida a chave menos recentemente utilizada** antes da nova inserção.
4. As operações \`get\` e \`put\` devem ser eficientes (complexidade de tempo esperada $O(1)$).`,
    codigoTemplate: `import java.util.*;

public class Solution {
    private final int capacidade;
    private final Map<Integer, Integer> cache;

    public Solution(int capacidade) {
        if (capacidade <= 0) {
            throw new IllegalArgumentException("Capacidade deve ser positiva.");
        }
        this.capacidade = capacidade;
        this.cache = new LinkedHashMap<Integer, Integer>(capacidade, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
                return size() > Solution.this.capacidade;
            }
        };
    }

    public int get(int chave) {
        return cache.getOrDefault(chave, -1);
    }

    public void put(int chave, int valor) {
        cache.put(chave, valor);
    }
}
`,
    suiteTestesPublicos: `@Test void deveInserirERecuperarValores() {
    Solution lru = new Solution(2);
    lru.put(1, 100);
    lru.put(2, 200);
    assertEquals(100, lru.get(1));
    assertEquals(200, lru.get(2));
}

@Test void deveDescartarMenosUtilizadoAoExcederCapacidade() {
    Solution lru = new Solution(2);
    lru.put(1, 10);
    lru.put(2, 20);
    lru.get(1);     // Chave 1 torna-se recentemente usada; chave 2 fica como menos usada
    lru.put(3, 30); // Deve evictar a chave 2
    assertEquals(10, lru.get(1));
    assertEquals(-1, lru.get(2)); // Evictado!
    assertEquals(30, lru.get(3));
}
`,
    suiteTestesOcultos: `@Test void deveAtualizarValorExistenteSemEvictarIndevidamente() {
    Solution lru = new Solution(2);
    lru.put(1, 10);
    lru.put(2, 20);
    lru.put(1, 15); // Atualiza chave 1
    lru.put(3, 30); // Deve evictar a chave 2
    assertEquals(15, lru.get(1));
    assertEquals(-1, lru.get(2));
    assertEquals(30, lru.get(3));
}

@Test void deveLancarExcecaoParaCapacidadeInvalida() {
    boolean lancou = false;
    try {
        new Solution(0);
    } catch (IllegalArgumentException e) {
        lancou = true;
    }
    assertTrue(lancou);
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Agrupador de Sessões de Usuário por Janela de Inatividade",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Na análise de segurança e auditoria forense do sistema de concursos, é necessário reconstruir as sessões de navegação dos candidatos e examinadores a partir de logs brutos de eventos HTTP para detecção de anomalias e compartilhamento de contas.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static Map<String, Integer> calcularQtdSessoes(List<String> logsEventos, int timeoutInatividadeSegundos)
\`\`\`

### Formato dos Logs:
Cada entrada possui a estrutura: \`"TIMESTAMP_EPOCH:USUARIO_ID"\` (ex: \`"1700000100:cand_123"\`).
Os logs não estão garantidamente ordenados na lista de entrada.

### Regras de Negócio:
1. Uma **sessão** é uma sequência de eventos do mesmo usuário em que o intervalo entre dois eventos consecutivos não excede \`timeoutInatividadeSegundos\`.
2. Se o tempo decorrido entre o evento atual e o evento imediatamente anterior do mesmo usuário for estritamente **maior** que \`timeoutInatividadeSegundos\`, inicia-se uma **nova sessão**.
3. O retorno deve ser um \`Map<String, Integer>\` contendo a quantidade total de sessões distintas de cada \`usuario_id\`.
4. Usuários com 1 ou mais eventos sempre possuem ao menos 1 sessão.
5. Se a lista for nula ou vazia, retorne um mapa vazio (\`new HashMap<>()\`).`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static Map<String, Integer> calcularQtdSessoes(List<String> logsEventos, int timeoutInatividadeSegundos) {
        if (logsEventos == null || logsEventos.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, List<Long>> eventosPorUsuario = new HashMap<>();

        for (String log : logsEventos) {
            if (log == null || !log.contains(":")) continue;
            String[] partes = log.split(":", 2);
            try {
                long ts = Long.parseLong(partes[0].trim());
                String user = partes[1].trim();
                eventosPorUsuario.computeIfAbsent(user, k -> new ArrayList<>()).add(ts);
            } catch (NumberFormatException ignored) {}
        }

        Map<String, Integer> resultado = new HashMap<>();

        for (Map.Entry<String, List<Long>> entry : eventosPorUsuario.entrySet()) {
            String user = entry.getKey();
            List<Long> timestamps = entry.getValue();
            Collections.sort(timestamps);

            int sessoes = 1;
            for (int i = 1; i < timestamps.size(); i++) {
                if (timestamps.get(i) - timestamps.get(i - 1) > timeoutInatividadeSegundos) {
                    sessoes++;
                }
            }
            resultado.put(user, sessoes);
        }

        return resultado;
    }
}
`,
    suiteTestesPublicos: `@Test void deveContarSessaoUnicaDentroDoTimeout() {
    // Timeout de 300 segundos (5 min)
    List<String> logs = Arrays.asList(
        "1000:user1", "1100:user1", "1250:user1"
    );
    Map<String, Integer> res = Solution.calcularQtdSessoes(logs, 300);
    assertEquals(Integer.valueOf(1), res.get("user1"));
}

@Test void deveQuebrarSessoesAoUltrapassarTimeout() {
    List<String> logs = Arrays.asList(
        "1000:userA", "1050:userA", "2000:userA"
    );
    Map<String, Integer> res = Solution.calcularQtdSessoes(logs, 300);
    assertEquals(Integer.valueOf(2), res.get("userA"));
}
`,
    suiteTestesOcultos: `@Test void deveProcessarMultiplosUsuariosDesordenados() {
    List<String> logs = Arrays.asList(
        "2000:u1", "1000:u2", "1000:u1", "1500:u2"
    );
    Map<String, Integer> res = Solution.calcularQtdSessoes(logs, 200);
    assertEquals(Integer.valueOf(2), res.get("u1")); // u1: 1000 e 2000 (diff 1000 > 200) -> 2 sessões
    assertEquals(Integer.valueOf(2), res.get("u2")); // u2: 1000 e 1500 (diff 500 > 200) -> 2 sessões
}

@Test void deveLidarComEntradaVaziaOuNula() {
    assertTrue(Solution.calcularQtdSessoes(null, 60).isEmpty());
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Detector de Dependências Circulares em Tarefas (Grafo Direcionado)",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O orquestrador de automações e pipelines de compilação de provas precisa garantir que um plano de tarefas não contenha ciclos (deadlock de dependências), onde a tarefa A depende de B, que direta ou indiretamente depende de A.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static boolean possuiDependenciaCircular(int numTarefas, int[][] dependencias)
\`\`\`

### Parâmetros:
- \`numTarefas\`: Quantidade de tarefas identificadas de \`0\` a \`numTarefas - 1\`.
- \`dependencias\`: Array bidimensional onde cada linha \`[a, b]\` indica que a tarefa \`a\` depende da conclusão prévia da tarefa \`b\` (aresta direcionada: \`b -> a\`).

### Regras de Negócio:
1. Retorne \`true\` se houver **qualquer dependência circular** (ciclo no grafo direcionado).
2. Retorne \`false\` se o grafo for um DAG (Directed Acyclic Graph) válido e todas as tarefas puderem ser ordenadas topologicamente para execução.
3. Se \`numTarefas <= 1\` ou \`dependencias\` for nulo ou vazio, retorne \`false\`.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static boolean possuiDependenciaCircular(int numTarefas, int[][] dependencias) {
        if (numTarefas <= 1 || dependencias == null || dependencias.length == 0) {
            return false;
        }

        List<List<Integer>> grafo = new ArrayList<>();
        int[] grauEntrada = new int[numTarefas];

        for (int i = 0; i < numTarefas; i++) {
            grafo.add(new ArrayList<>());
        }

        for (int[] dep : dependencias) {
            int a = dep[0];
            int b = dep[1];
            if (a >= 0 && a < numTarefas && b >= 0 && b < numTarefas) {
                grafo.get(b).add(a);
                grauEntrada[a]++;
            }
        }

        Queue<Integer> fila = new ArrayDeque<>();
        for (int i = 0; i < numTarefas; i++) {
            if (grauEntrada[i] == 0) {
                fila.add(i);
            }
        }

        int visitados = 0;
        while (!fila.isEmpty()) {
            int atual = fila.poll();
            visitados++;
            for (int vizinho : grafo.get(atual)) {
                grauEntrada[vizinho]--;
                if (grauEntrada[vizinho] == 0) {
                    fila.add(vizinho);
                }
            }
        }

        return visitados != numTarefas;
    }
}
`,
    suiteTestesPublicos: `@Test void deveAprovarGrafoAciclicoLinear() {
    // 0 depende de 1, 1 depende de 2 (ordem: 2 -> 1 -> 0)
    int[][] deps = new int[][]{ {0, 1}, {1, 2} };
    assertFalse(Solution.possuiDependenciaCircular(3, deps));
}

@Test void deveDetectarCicloSimplesDireto() {
    // 0 depende de 1, e 1 depende de 0
    int[][] deps = new int[][]{ {0, 1}, {1, 0} };
    assertTrue(Solution.possuiDependenciaCircular(2, deps));
}
`,
    suiteTestesOcultos: `@Test void deveDetectarCicloIndireto() {
    // 0 depende de 1, 1 de 2, 2 de 3, 3 de 0
    int[][] deps = new int[][]{ {0, 1}, {1, 2}, {2, 3}, {3, 0} };
    assertTrue(Solution.possuiDependenciaCircular(4, deps));
}

@Test void deveRetornarFalseParaSemDependencias() {
    assertFalse(Solution.possuiDependenciaCircular(5, new int[0][]));
    assertFalse(Solution.possuiDependenciaCircular(5, null));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Auditoria de Limites da Lei de Responsabilidade Fiscal (LRF)",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
A gestão fiscal dos entes públicos é regida pela Lei Complementar nº 101/2000 (LRF). O gasto total com pessoal do Poder Executivo Municipal não pode exceder 54% da Receita Corrente Líquida (RCL). A lei estipula ainda limites intermediários de Alerta e Prudencial.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String enquadrarGastoPessoal(double rcl, double gastoPessoal)
\`\`\`

### Parâmetros e Regras da LRF (Poder Executivo Municipal):
- **Limite Máximo Legal:** **54,00%** da RCL
- **Limite Prudencial:** **95% do Limite Máximo** = **51,30%** da RCL (\`54% * 0.95\`)
- **Limite de Alerta:** **90% do Limite Máximo** = **48,60%** da RCL (\`54% * 0.90\`)

### Retornos Esperados (String exata):
1. Se \`rcl <= 0.0\` ou \`gastoPessoal < 0.0\`: retorne \`"PARAMETROS_INVALIDOS"\`.
2. Se o percentual de gasto \`p = (gastoPessoal / rcl) * 100\` for:
   - \`p < 48.60\`: retorne \`"REGULAR"\`
   - \`48.60 <= p < 51.30\`: retorne \`"ALERTA"\`
   - \`51.30 <= p <= 54.00\`: retorne \`"PRUDENCIAL"\`
   - \`p > 54.00\`: retorne \`"EXCEDIDO"\`
3. Adote precisão em ponto flutuante considerando tolerância de \`1e-6\`.`,
    codigoTemplate: `public class Solution {
    public static String enquadrarGastoPessoal(double rcl, double gastoPessoal) {
        if (rcl <= 0.0 || gastoPessoal < 0.0) {
            return "PARAMETROS_INVALIDOS";
        }
        double perc = (gastoPessoal / rcl) * 100.0;
        double eps = 1e-6;

        if (perc > 54.0 + eps) {
            return "EXCEDIDO";
        } else if (perc >= 51.30 - eps) {
            return "PRUDENCIAL";
        } else if (perc >= 48.60 - eps) {
            return "ALERTA";
        } else {
            return "REGULAR";
        }
    }
}
`,
    suiteTestesPublicos: `@Test void deveIdentificarSituacaoRegular() {
    // RCL = 1.000.000, Gasto = 400.000 (40% < 48.6%)
    assertEquals("REGULAR", Solution.enquadrarGastoPessoal(1000000.0, 400000.0));
}

@Test void deveIdentificarLimiteExcedido() {
    // RCL = 1.000.000, Gasto = 550.000 (55% > 54%)
    assertEquals("EXCEDIDO", Solution.enquadrarGastoPessoal(1000000.0, 550000.0));
}
`,
    suiteTestesOcultos: `@Test void deveIdentificarAlertaEPrudencial() {
    assertEquals("ALERTA", Solution.enquadrarGastoPessoal(1000000.0, 490000.0));     // 49%
    assertEquals("PRUDENCIAL", Solution.enquadrarGastoPessoal(1000000.0, 520000.0)); // 52%
}

@Test void deveValidarParametrosInvalidos() {
    assertEquals("PARAMETROS_INVALIDOS", Solution.enquadrarGastoPessoal(0.0, 100.0));
    assertEquals("PARAMETROS_INVALIDOS", Solution.enquadrarGastoPessoal(-10.0, 100.0));
    assertEquals("PARAMETROS_INVALIDOS", Solution.enquadrarGastoPessoal(1000.0, -1.0));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Fila de Prioridades com Desempate Cronológico (PriorityQueue)",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O subsistema de execução de testes de código do DevTest recebe trabalhos de múltiplos candidatos simultâneos. Trabalhos de homologação e de candidatos com atendimento preferencial possuem maior prioridade, mas tarefas de mesma prioridade devem ser processadas estritamente na ordem de chegada (FIFO).

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<String> ordenarTarefas(List<String> tarefasRaw)
\`\`\`

### Formato de Entrada:
Cada elemento possui o formato: \`"ID_TAREFA:PRIORIDADE:TIMESTAMP"\`
- \`ID_TAREFA\`: String identificadora (ex: \`"job-42"\`)
- \`PRIORIDADE\`: Inteiro de 1 a 10 (onde **10 é a prioridade máxima** e 1 a mínima)
- \`TIMESTAMP\`: Inteiro longo representando o milissegundo de envio

### Regras de Ordenação:
1. Tarefas com **maior prioridade** devem ser executadas primeiro.
2. Em caso de **empate na prioridade**, a tarefa com **menor timestamp** (mais antiga) tem preferência.
3. O retorno deve conter exclusivamente a lista dos \`ID_TAREFA\` na ordem exata de despacho.
4. Se a lista for nula ou vazia, retorne uma lista vazia.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    private static class Tarefa {
        String id;
        int prioridade;
        long timestamp;

        Tarefa(String id, int prioridade, long timestamp) {
            this.id = id;
            this.prioridade = prioridade;
            this.timestamp = timestamp;
        }
    }

    public static List<String> ordenarTarefas(List<String> tarefasRaw) {
        if (tarefasRaw == null || tarefasRaw.isEmpty()) {
            return new ArrayList<>();
        }

        PriorityQueue<Tarefa> pq = new PriorityQueue<>((a, b) -> {
            if (a.prioridade != b.prioridade) {
                return Integer.compare(b.prioridade, a.prioridade); // Maior prioridade primeiro
            }
            return Long.compare(a.timestamp, b.timestamp); // Menor timestamp primeiro
        });

        for (String raw : tarefasRaw) {
            if (raw == null) continue;
            String[] p = raw.split(":");
            if (p.length == 3) {
                pq.add(new Tarefa(p[0].trim(), Integer.parseInt(p[1].trim()), Long.parseLong(p[2].trim())));
            }
        }

        List<String> resultado = new ArrayList<>();
        while (!pq.isEmpty()) {
            resultado.add(pq.poll().id);
        }
        return resultado;
    }
}
`,
    suiteTestesPublicos: `@Test void devePriorizarMaiorPrioridade() {
    List<String> entrada = Arrays.asList(
        "job-baixo:1:1000", "job-alto:10:2000"
    );
    List<String> res = Solution.ordenarTarefas(entrada);
    assertEquals("job-alto", res.get(0));
    assertEquals("job-baixo", res.get(1));
}

@Test void deveDesempatarPeloTimestampMaisAntigo() {
    List<String> entrada = Arrays.asList(
        "job-recente:5:5000", "job-antigo:5:1000"
    );
    List<String> res = Solution.ordenarTarefas(entrada);
    assertEquals("job-antigo", res.get(0));
    assertEquals("job-recente", res.get(1));
}
`,
    suiteTestesOcultos: `@Test void deveOrdenarCenarioMistoCompleto() {
    List<String> entrada = Arrays.asList(
        "t1:5:200", "t2:8:100", "t3:8:50", "t4:2:300"
    );
    List<String> res = Solution.ordenarTarefas(entrada);
    assertEquals("t3", res.get(0)); // Prioridade 8, time 50
    assertEquals("t2", res.get(1)); // Prioridade 8, time 100
    assertEquals("t1", res.get(2)); // Prioridade 5, time 200
    assertEquals("t4", res.get(3)); // Prioridade 2, time 300
}

@Test void deveLidarComEntradaNulaOuVazia() {
    assertTrue(Solution.ordenarTarefas(null).isEmpty());
    assertTrue(Solution.ordenarTarefas(new ArrayList<>()).isEmpty());
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Avaliador de Expressões Aritméticas em Notação Polonesa Reversa (RPN)",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O motor de avaliação de fórmulas de remuneração e pontuação de baremas interpreta expressões pré-compiladas em **Notação Polonesa Reversa** (Postfix/RPN) para eliminar ambiguidades de parênteses e permitir avaliação em pilha sem recursão.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static int avaliarRPN(String[] tokens)
\`\`\`

### Regras de Negócio:
1. Os operadores válidos são \`"+"\`, \`"-"\`, \`"*"\` e \`"/"\`.
2. Cada operando pode ser um número inteiro positivo ou negativo (ex: \`"42"\`, \`"-10"\`).
3. A divisão de inteiros deve truncar em direção ao zero (\`6 / -132 = 0\`).
4. Se houver divisão por zero (\`x / 0\`), lance uma exceção \`ArithmeticException\`.
5. Se a expressão for malformada (operandos insuficientes para operadores ou sobrando no final), lance \`IllegalArgumentException\`.
6. Se \`tokens\` for nulo ou vazio, lance \`IllegalArgumentException\`.

### Exemplo:
- Tokens: \`["2", "1", "+", "3", "*"]\` -> \`((2 + 1) * 3) = 9\`
- Tokens: \`["4", "13", "5", "/", "+"]\` -> \`(4 + (13 / 5)) = 6\``,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static int avaliarRPN(String[] tokens) {
        if (tokens == null || tokens.length == 0) {
            throw new IllegalArgumentException("Tokens nao podem ser nulos ou vazios.");
        }

        Deque<Integer> pilha = new ArrayDeque<>();

        for (String token : tokens) {
            if (token == null || token.trim().isEmpty()) continue;
            String t = token.trim();

            if (t.equals("+") || t.equals("-") || t.equals("*") || t.equals("/")) {
                if (pilha.size() < 2) {
                    throw new IllegalArgumentException("Expressao RPN malformada.");
                }
                int b = pilha.pop();
                int a = pilha.pop();

                switch (t) {
                    case "+": pilha.push(a + b); break;
                    case "-": pilha.push(a - b); break;
                    case "*": pilha.push(a * b); break;
                    case "/":
                        if (b == 0) throw new ArithmeticException("Divisao por zero.");
                        pilha.push(a / b);
                        break;
                }
            } else {
                try {
                    pilha.push(Integer.parseInt(t));
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Token invalido: " + t);
                }
            }
        }

        if (pilha.size() != 1) {
            throw new IllegalArgumentException("Expressao RPN malformada.");
        }

        return pilha.pop();
    }
}
`,
    suiteTestesPublicos: `@Test void deveAvaliarExpressaoComSomaEMultiplicacao() {
    String[] tokens = new String[]{"2", "1", "+", "3", "*"};
    assertEquals(9, Solution.avaliarRPN(tokens));
}

@Test void deveAvaliarDivisaoTruncandoParaZero() {
    String[] tokens = new String[]{"4", "13", "5", "/", "+"};
    assertEquals(6, Solution.avaliarRPN(tokens));
}
`,
    suiteTestesOcultos: `@Test void deveLancarExcecaoEmDivisaoPorZero() {
    boolean lancou = false;
    try {
        Solution.avaliarRPN(new String[]{"10", "0", "/"});
    } catch (ArithmeticException e) {
        lancou = true;
    }
    assertTrue(lancou);
}

@Test void deveLancarExcecaoParaExpressaoMalformada() {
    boolean lancou = false;
    try {
        Solution.avaliarRPN(new String[]{"1", "+"});
    } catch (IllegalArgumentException e) {
        lancou = true;
    }
    assertTrue(lancou);
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Cálculo de Troco Otimizado com Estoque Limitado de Moedas (DP)",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Nos caixas de recolhimento de taxas de inscrição e devolução de depósitos judiciais, o sistema precisa fornecer o valor de troco utilizando o **menor número total de cédulas/moedas possível**, respeitando as quantidades limitadas existentes no caixa no momento da operação.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static int[] calcularTrocoOtimizado(int valorTroco, int[] denominacoes, int[] estoqueDisponivel)
\`\`\`

### Parâmetros:
- \`valorTroco\`: Valor total a ser entregue em centavos (inteiro >= 0).
- \`denominacoes\`: Array de valores das moedas/cédulas disponíveis em centavos em ordem estritamente decrescente (ex: \`[100, 50, 25, 10, 5, 1]\`).
- \`estoqueDisponivel\`: Array de mesmo tamanho indicando quantas moedas de cada denominação existem no caixa.

### Regras de Negócio:
1. Se \`valorTroco == 0\`, retorne um array preenchido com zeros de mesmo tamanho que \`denominacoes\`.
2. Deve encontrar a combinação válida de moedas que totalize exatamente \`valorTroco\` com a **menor quantidade total de moedas somadas**, respeitando o limite \`estoqueDisponivel[i]\` para cada denominação.
3. Se for **impossível** fornecer o troco exato com o estoque existente, retorne um array vazio: \`new int[0]\`.
4. O array retornado contém a quantidade utilizada de cada denominação na mesma ordem de \`denominacoes\`.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static int[] calcularTrocoOtimizado(int valorTroco, int[] denominacoes, int[] estoqueDisponivel) {
        if (denominacoes == null || estoqueDisponivel == null || denominacoes.length != estoqueDisponivel.length) {
            return new int[0];
        }
        int n = denominacoes.length;
        if (valorTroco == 0) {
            return new int[n];
        }

        // BFS / Branch and Bound com memoização de estado para encontrar a menor quantidade de moedas
        int[] melhorSolucao = null;
        int menorQtdMoedas = Integer.MAX_VALUE;

        // Fila com: {indiceDenominacao, valorRestante, totalMoedasUsadas, ...distribuicao}
        // Para Pleno e limites moderados, uma busca em profundidade com poda (DFS + pruning) é rápida e exata:
        int[] solucaoAtual = new int[n];
        int[] resultado = new int[n];
        boolean[] encontrou = new boolean[]{false};
        int[] minMoedas = new int[]{Integer.MAX_VALUE};

        dfs(0, valorTroco, 0, denominacoes, estoqueDisponivel, solucaoAtual, resultado, minMoedas, encontrou);

        return encontrou[0] ? resultado : new int[0];
    }

    private static void dfs(
        int idx, int restante, int moedasUsadas,
        int[] denoms, int[] estoque,
        int[] atual, int[] melhor, int[] minMoedas, boolean[] encontrou
    ) {
        if (restante == 0) {
            if (moedasUsadas < minMoedas[0]) {
                minMoedas[0] = moedasUsadas;
                System.arraycopy(atual, 0, melhor, 0, atual.length);
                encontrou[0] = true;
            }
            return;
        }

        if (idx >= denoms.length || moedasUsadas >= minMoedas[0]) {
            return;
        }

        int maxPossivel = Math.min(estoque[idx], restante / denoms[idx]);

        // Testa do maior número de moedas da maior denominação para o menor (guloso guiado)
        for (int q = maxPossivel; q >= 0; q--) {
            if (moedasUsadas + q >= minMoedas[0]) continue;
            atual[idx] = q;
            dfs(idx + 1, restante - (q * denoms[idx]), moedasUsadas + q, denoms, estoque, atual, melhor, minMoedas, encontrou);
            atual[idx] = 0;
        }
    }
}
`,
    suiteTestesPublicos: `@Test void deveCalcularTrocoExatoComMinimoDeMoedas() {
    int[] denoms = new int[]{100, 50, 25, 10, 5, 1};
    int[] estoque = new int[]{10, 10, 10, 10, 10, 10};
    int[] res = Solution.calcularTrocoOtimizado(185, denoms, estoque);
    assertEquals(6, res.length);
    assertEquals(1, res[0]); // 1x 100
    assertEquals(1, res[1]); // 1x 50
    assertEquals(1, res[2]); // 1x 25
    assertEquals(1, res[3]); // 1x 10
    assertEquals(0, res[4]); // 0x 5
    assertEquals(0, res[5]); // 0x 1
}

@Test void deveRespeitarLimiteDeEstoque() {
    // Troco 100, mas não tem moeda de 100, só tem 50
    int[] denoms = new int[]{100, 50, 10};
    int[] estoque = new int[]{0, 5, 10};
    int[] res = Solution.calcularTrocoOtimizado(100, denoms, estoque);
    assertEquals(0, res[0]); // 0x 100
    assertEquals(2, res[1]); // 2x 50
}
`,
    suiteTestesOcultos: `@Test void deveRetornarVazioQuandoTrocoForImpossivel() {
    int[] denoms = new int[]{10, 5};
    int[] estoque = new int[]{2, 2};
    // Tenta 3 centavos (impossível com moedas de 10 e 5)
    int[] res = Solution.calcularTrocoOtimizado(3, denoms, estoque);
    assertEquals(0, res.length);
}

@Test void deveRetornarZerosQuandoTrocoForZero() {
    int[] denoms = new int[]{50, 20};
    int[] estoque = new int[]{5, 5};
    int[] res = Solution.calcularTrocoOtimizado(0, denoms, estoque);
    assertEquals(2, res.length);
    assertEquals(0, res[0]);
    assertEquals(0, res[1]);
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
];

async function main() {
  console.log("Autenticando como Banca Avaliadora...");
  const loginRes = await request(
    {
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      identificador: BANCA_EMAIL,
      senha: BANCA_SENHA,
      perfil: "BANCA_AVALIADORA",
    }
  );

  const token = loginRes.data?.token;
  if (!token) {
    console.error("Falha ao obter token da banca:", loginRes);
    process.exit(1);
  }
  console.log("Token obtido com sucesso!");


  console.log(`Cadastrando ${desafiosPleno.length} desafios nível Pleno em Java...`);

  for (let i = 0; i < desafiosPleno.length; i++) {
    const d = desafiosPleno[i];
    console.log(`[${i + 1}/${desafiosPleno.length}] Criando desafio: ${d.titulo}...`);

    const payload = {
      ...d,
      processoSeletivoId: PROCESSO_SELETIVO_ID,
      trilhaId: TRILHA_ID,
    };

    const res = await request(
      {
        path: "/api/desafios",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `devtest_sessao=${token}`,
        },
      },
      payload
    );

    if (res.data?.sucesso) {
      console.log(`  ✓ Sucesso! ID: ${res.data.desafio.id}`);
    } else {
      console.error(`  ✗ Erro:`, res.data || res.raw);
    }
  }

  console.log("\nTodos os desafios nível Pleno foram cadastrados com sucesso!");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
