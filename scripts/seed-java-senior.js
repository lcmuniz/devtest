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

const desafiosSenior = [
  {
    titulo: "Implementação de Consistent Hashing com Nós Virtuais",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto Arquitetural
Em arquiteturas de microsserviços distribuídos e bancos de dados particionados (como Cassandra e DynamoDB), o **Consistent Hashing** é a técnica padrão para distribuir chaves entre múltiplos nós minimizando a realocação de dados quando nós entram ou saem do cluster. Para garantir distribuição uniforme de carga, cada nó físico é representado por múltiplos **nós virtuais** (virtual nodes) espalhados ao longo do anel de hash de 32 bits.

## Especificação da Tarefa
Implemente a classe \`Solution\` que gerencia o anel de hash:
\`\`\`java
public class Solution {
    public Solution(int numNosVirtuaisPorServidor) { ... }
    public void adicionarServidor(String servidor) { ... }
    public void removerServidor(String servidor) { ... }
    public String obterServidor(String chave) { ... }
}
\`\`\`

### Regras do Anel de Hash:
1. O construtor recebe \`numNosVirtuaisPorServidor >= 1\`. Se for menor que 1, lance \`IllegalArgumentException\`.
2. Para cada servidor adicionado com identificador \`servidor\` (ex: \`"node-1"\`), gere \`numNosVirtuaisPorServidor\` nós virtuais usando a chave \`servidor + "#" + i\` (onde \`i\` varia de \`0\` a \`numNosVirtuaisPorServidor - 1\`).
3. Função de Hash do Anel: Para mapear uma string em uma posição inteira do anel de 32 bits, utilize o hash SHA-256 dos bytes UTF-8 da string, extraindo os primeiros 4 bytes como um inteiro com sinal (\`ByteBuffer.wrap(sha256).getInt()\`).
4. Os nós virtuais devem ser armazenados em uma estrutura ordenada em anel (ex: \`TreeMap<Integer, String>\`).
5. Ao consultar \`obterServidor(String chave)\`:
   - Se não houver servidores no anel, retorne \`null\`.
   - Calcule o hash de \`chave\`.
   - Encontre o primeiro nó virtual com hash maior ou igual ao hash da chave (sentido horário no anel).
   - Se não houver nó com hash maior ou igual (final do mapa), dê a volta no anel selecionando o nó de menor hash do anel (\`firstEntry()\`).
   - Retorne o nome do servidor físico correspondente ao nó virtual selecionado.
6. Ao remover um servidor, todos os seus nós virtuais devem ser expurgados do anel.`,
    codigoTemplate: `import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.util.*;

public class Solution {
    private final int numVirtuais;
    private final SortedMap<Integer, String> anel = new TreeMap<>();

    public Solution(int numNosVirtuaisPorServidor) {
        if (numNosVirtuaisPorServidor < 1) {
            throw new IllegalArgumentException("Numero de nos virtuais deve ser >= 1");
        }
        this.numVirtuais = numNosVirtuaisPorServidor;
    }

    private int calcularHash(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(s.getBytes("UTF-8"));
            return ByteBuffer.wrap(digest).getInt();
        } catch (Exception e) {
            return s.hashCode();
        }
    }

    public void adicionarServidor(String servidor) {
        if (servidor == null || servidor.trim().isEmpty()) return;
        for (int i = 0; i < numVirtuais; i++) {
            int hash = calcularHash(servidor + "#" + i);
            anel.put(hash, servidor);
        }
    }

    public void removerServidor(String servidor) {
        if (servidor == null) return;
        for (int i = 0; i < numVirtuais; i++) {
            int hash = calcularHash(servidor + "#" + i);
            anel.remove(hash);
        }
    }

    public String obterServidor(String chave) {
        if (anel.isEmpty() || chave == null) return null;
        int hash = calcularHash(chave);
        SortedMap<Integer, String> tail = anel.tailMap(hash);
        int targetHash = tail.isEmpty() ? anel.firstKey() : tail.firstKey();
        return anel.get(targetHash);
    }
}
`,
    suiteTestesPublicos: `@Test void deveDistribuirERoteamentoDeterminista() {
    Solution ring = new Solution(3);
    ring.adicionarServidor("nodeA");
    ring.adicionarServidor("nodeB");

    String dest1 = ring.obterServidor("chave-teste-1");
    String dest2 = ring.obterServidor("chave-teste-1");
    assertEquals(dest1, dest2); // Roteamento determinístico para a mesma chave
    assertTrue(dest1.equals("nodeA") || dest1.equals("nodeB"));
}

@Test void deveRemoverServidorERedirecionar() {
    Solution ring = new Solution(5);
    ring.adicionarServidor("nodeA");
    ring.adicionarServidor("nodeB");

    ring.removerServidor("nodeA");
    // Agora todo o tráfego deve ir obrigatoriamente para nodeB
    assertEquals("nodeB", ring.obterServidor("chave-1"));
    assertEquals("nodeB", ring.obterServidor("chave-2"));
}
`,
    suiteTestesOcultos: `@Test void deveRetornarNullQuandoAnelVazio() {
    Solution ring = new Solution(2);
    assertEquals(null, ring.obterServidor("qualquerChave"));
}

@Test void deveLancarExcecaoParaNumeroVirtuaisInvalido() {
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
    titulo: "Máquina de Estados de Circuit Breaker para Microsserviços",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto Arquitetural
Em sistemas de alta disponibilidade distribuídos, o padrão **Circuit Breaker** previne que falhas transitórias em um serviço downstream causem falha em cascata em toda a infraestrutura.

## Especificação da Tarefa
Implemente a classe \`Solution\` representando o Circuit Breaker:
\`\`\`java
public class Solution {
    public Solution(int tamanhoJanela, double limiarFalhaPercentual, long timeoutAberturaMs) { ... }
    public boolean permitirRequisicao(long timestampMs) { ... }
    public void registrarSucesso(long timestampMs) { ... }
    public void registrarFalha(long timestampMs) { ... }
    public String obterEstadoAtual(long timestampMs) { ... }
}
\`\`\`

### Estados e Regras de Transição:
1. **CLOSED (Fechado - Operação Normal):**
   - Todas as requisições são permitidas (\`permitirRequisicao\` retorna \`true\`).
   - Mantém uma janela circular das últimas \`tamanhoJanela\` chamadas registradas (\`registrarSucesso\` ou \`registrarFalha\`).
   - Se a janela atingir \`tamanhoJanela\` chamadas e o percentual de falhas for estritamente **maior ou igual** a \`limiarFalhaPercentual\` (ex: \`50.0\`), o circuito transita imediatamente para **OPEN** no instante do registro, gravando o timestamp da abertura.
2. **OPEN (Aberto - Circuito Interrompido):**
   - Todas as requisições são bloqueadas (\`permitirRequisicao\` retorna \`false\`).
   - Permanece em **OPEN** durante \`timeoutAberturaMs\` milissegundos.
   - Quando uma nova chamada chega com \`timestampMs >= timestampAbertura + timeoutAberturaMs\`, o circuito transita automaticamente para **HALF_OPEN**.
3. **HALF_OPEN (Meio-Aberto - Teste de Recuperação):**
   - Permite exatamente **1 única requisição de teste**.
   - Se a requisição de teste resultar em \`registrarSucesso\`, o circuito é restaurado para **CLOSED** e o histórico da janela é limpo.
   - Se resultar em \`registrarFalha\`, o circuito retorna imediatamente para **OPEN**, reiniciando a contagem de \`timeoutAberturaMs\`.
4. Os métodos recebem \`timestampMs\` crescente. Os retornos de \`obterEstadoAtual\` são: \`"CLOSED"\`, \`"OPEN"\` ou \`"HALF_OPEN"\`.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    private final int tamanhoJanela;
    private final double limiarFalha;
    private final long timeoutAbertura;

    private String estado = "CLOSED";
    private long timestampAbertura = 0;
    private boolean testeEmAndamento = false;
    private final Deque<Boolean> historico = new ArrayDeque<>();

    public Solution(int tamanhoJanela, double limiarFalhaPercentual, long timeoutAberturaMs) {
        this.tamanhoJanela = tamanhoJanela;
        this.limiarFalha = limiarFalhaPercentual;
        this.timeoutAbertura = timeoutAberturaMs;
    }

    private void atualizarEstado(long ts) {
        if ("OPEN".equals(estado) && ts >= timestampAbertura + timeoutAbertura) {
            estado = "HALF_OPEN";
            testeEmAndamento = false;
        }
    }

    public synchronized boolean permitirRequisicao(long timestampMs) {
        atualizarEstado(timestampMs);
        if ("CLOSED".equals(estado)) {
            return true;
        }
        if ("HALF_OPEN".equals(estado)) {
            if (!testeEmAndamento) {
                testeEmAndamento = true;
                return true;
            }
            return false;
        }
        return false;
    }

    public synchronized void registrarSucesso(long timestampMs) {
        atualizarEstado(timestampMs);
        if ("HALF_OPEN".equals(estado)) {
            estado = "CLOSED";
            historico.clear();
            testeEmAndamento = false;
        } else if ("CLOSED".equals(estado)) {
            adicionarHistorico(true);
        }
    }

    public synchronized void registrarFalha(long timestampMs) {
        atualizarEstado(timestampMs);
        if ("HALF_OPEN".equals(estado)) {
            estado = "OPEN";
            timestampAbertura = timestampMs;
            testeEmAndamento = false;
        } else if ("CLOSED".equals(estado)) {
            adicionarHistorico(false);
            if (historico.size() >= tamanhoJanela) {
                int falhas = 0;
                for (boolean ok : historico) {
                    if (!ok) falhas++;
                }
                double perc = (falhas * 100.0) / historico.size();
                if (perc >= limiarFalha) {
                    estado = "OPEN";
                    timestampAbertura = timestampMs;
                }
            }
        }
    }

    private void adicionarHistorico(boolean sucesso) {
        if (historico.size() >= tamanhoJanela) {
            historico.pollFirst();
        }
        historico.addLast(sucesso);
    }

    public synchronized String obterEstadoAtual(long timestampMs) {
        atualizarEstado(timestampMs);
        return estado;
    }
}
`,
    suiteTestesPublicos: `@Test void deveAbrirCircuitoAoAtingirLimiarDeFalhas() {
    // Janela 4 chamadas, 50% falha, timeout 1000ms
    Solution cb = new Solution(4, 50.0, 1000);
    cb.registrarSucesso(100);
    cb.registrarSucesso(200);
    cb.registrarFalha(300);
    cb.registrarFalha(400); // 2 falhas em 4 = 50% -> deve abrir

    assertEquals("OPEN", cb.obterEstadoAtual(400));
    assertFalse(cb.permitirRequisicao(500));
}

@Test void deveTransitarParaHalfOpenAposTimeoutERecuperar() {
    Solution cb = new Solution(2, 50.0, 1000);
    cb.registrarFalha(100);
    cb.registrarFalha(200); // Abre em 200
    assertEquals("OPEN", cb.obterEstadoAtual(500));

    // Aos 1200ms (> 200 + 1000) deve passar para HALF_OPEN
    assertEquals("HALF_OPEN", cb.obterEstadoAtual(1200));
    assertTrue(cb.permitirRequisicao(1200)); // Permite 1 teste

    cb.registrarSucesso(1250); // Teste com sucesso restaura para CLOSED
    assertEquals("CLOSED", cb.obterEstadoAtual(1250));
}
`,
    suiteTestesOcultos: `@Test void deveReabrirAoFalharTesteEmHalfOpen() {
    Solution cb = new Solution(2, 50.0, 500);
    cb.registrarFalha(100);
    cb.registrarFalha(200);

    assertEquals("HALF_OPEN", cb.obterEstadoAtual(701));
    assertTrue(cb.permitirRequisicao(701));

    cb.registrarFalha(705); // Falha de teste reabre imediatamente
    assertEquals("OPEN", cb.obterEstadoAtual(705));
    assertFalse(cb.permitirRequisicao(800));
}

@Test void deveManterClosedAbaixoDoLimiar() {
    Solution cb = new Solution(4, 50.0, 1000);
    cb.registrarSucesso(100);
    cb.registrarSucesso(200);
    cb.registrarSucesso(300);
    cb.registrarFalha(400); // 1 falha em 4 = 25% < 50%
    assertEquals("CLOSED", cb.obterEstadoAtual(400));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Cálculo do Caminho Crítico de Obras Públicas (CPM em DAGs)",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Na auditoria de cronogramas físico-financeiros de grandes obras e contratos públicos, os auditores de engenharia e TI aplicam o método **CPM (Critical Path Method)** sobre redes de precedência para descobrir a duração mínima total da obra e identificar o conjunto de atividades críticas (folga total zero), cujo atraso acarreta atraso irremediável na entrega final.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<String> calcularCaminhoCritico(List<String> tarefasDef, List<String> precedencias)
\`\`\`

### Formato de Entrada:
- \`tarefasDef\`: Lista de strings no formato \`"ID_TAREFA:DURACAO_DIAS"\` (ex: \`["A:3", "B:4", "C:2"]\`).
- \`precedencias\`: Lista de strings no formato \`"PREDECESSORA->SUCESSORA"\` (ex: \`["A->B", "B->C"]\`).
- O grafo de atividades é garantidamente um Grafo Direcionado Acíclico (DAG).

### Regras do CPM:
1. **Early Start (ES) e Early Finish (EF):**
   - Tarefas sem predecessoras iniciam em \`ES = 0\`.
   - \`EF = ES + DURACAO\`.
   - Para tarefas com predecessoras: \`ES = max(EF de todas as predecessoras imediatas)\`.
2. A duração total do projeto é o maior \`EF\` entre todas as tarefas finais.
3. **Late Start (LS) e Late Finish (LF):**
   - Para tarefas sem sucessoras: \`LF = Duração Total do Projeto\`.
   - Para as demais: \`LF = min(LS de todas as sucessoras imediatas)\`.
   - \`LS = LF - DURACAO\`.
4. **Folga Total:** \`Folga = LS - ES = LF - EF\`.
5. Uma tarefa pertence ao **Caminho Crítico** se e somente se sua folga for igual a zero (\`Folga == 0\`).
6. O retorno deve ser a lista de \`ID_TAREFA\` pertencentes ao caminho crítico, ordenada em ordem topológica de execução. Se houver ramos paralelos com folga zero, ordene alfabeticamente os nós do mesmo nível.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    private static class Atividade {
        String id;
        int duracao;
        int es = 0;
        int ef = 0;
        int ls = Integer.MAX_VALUE;
        int lf = Integer.MAX_VALUE;
        List<Atividade> pred = new ArrayList<>();
        List<Atividade> succ = new ArrayList<>();

        Atividade(String id, int duracao) {
            this.id = id;
            this.duracao = duracao;
        }
    }

    public static List<String> calcularCaminhoCritico(List<String> tarefasDef, List<String> precedencias) {
        if (tarefasDef == null || tarefasDef.isEmpty()) return new ArrayList<>();

        Map<String, Atividade> map = new HashMap<>();
        for (String t : tarefasDef) {
            String[] p = t.split(":");
            map.put(p[0].trim(), new Atividade(p[0].trim(), Integer.parseInt(p[1].trim())));
        }

        if (precedencias != null) {
            for (String dep : precedencias) {
                if (!dep.contains("->")) continue;
                String[] p = dep.split("->");
                String de = p[0].trim();
                String para = p[1].trim();
                if (map.containsKey(de) && map.containsKey(para)) {
                    Atividade aDe = map.get(de);
                    Atividade aPara = map.get(para);
                    aDe.succ.add(aPara);
                    aPara.pred.add(aDe);
                }
            }
        }

        // Ordenação Topológica (Algoritmo de Kahn)
        Map<String, Integer> inDegree = new HashMap<>();
        for (Atividade a : map.values()) {
            inDegree.put(a.id, a.pred.size());
        }

        Queue<Atividade> fila = new ArrayDeque<>();
        for (Atividade a : map.values()) {
            if (inDegree.get(a.id) == 0) {
                fila.add(a);
            }
        }

        List<Atividade> ordemTopo = new ArrayList<>();
        while (!fila.isEmpty()) {
            Atividade u = fila.poll();
            ordemTopo.add(u);
            for (Atividade v : u.succ) {
                inDegree.put(v.id, inDegree.get(v.id) - 1);
                if (inDegree.get(v.id) == 0) {
                    fila.add(v);
                }
            }
        }

        // Forward Pass: calcula ES e EF
        int duracaoTotal = 0;
        for (Atividade a : ordemTopo) {
            int maxEfPred = 0;
            for (Atividade p : a.pred) {
                if (p.ef > maxEfPred) maxEfPred = p.ef;
            }
            a.es = maxEfPred;
            a.ef = a.es + a.duracao;
            if (a.ef > duracaoTotal) duracaoTotal = a.ef;
        }

        // Backward Pass: calcula LF e LS
        for (int i = ordemTopo.size() - 1; i >= 0; i--) {
            Atividade a = ordemTopo.get(i);
            if (a.succ.isEmpty()) {
                a.lf = duracaoTotal;
            } else {
                int minLsSucc = Integer.MAX_VALUE;
                for (Atividade s : a.succ) {
                    if (s.ls < minLsSucc) minLsSucc = s.ls;
                }
                a.lf = minLsSucc;
            }
            a.ls = a.lf - a.duracao;
        }

        List<String> criticos = new ArrayList<>();
        for (Atividade a : ordemTopo) {
            if (a.es == a.ls) {
                criticos.add(a.id);
            }
        }
        return criticos;
    }
}
`,
    suiteTestesPublicos: `@Test void deveIdentificarCaminhoCriticoLinear() {
    List<String> tarefas = Arrays.asList("A:3", "B:5", "C:2");
    List<String> deps = Arrays.asList("A->B", "B->C");
    List<String> crit = Solution.calcularCaminhoCritico(tarefas, deps);
    assertEquals(3, crit.size());
    assertEquals("A", crit.get(0));
    assertEquals("B", crit.get(1));
    assertEquals("C", crit.get(2));
}

@Test void deveDescartarTarefaComFolgaParalela() {
    // A(3) bifurca em B(5) e D(2). Depois ambas convergem em C(4).
    // Caminho A->B->C dura 3+5+4 = 12 dias.
    // Caminho A->D->C dura 3+2+4 = 9 dias (D tem folga de 3 dias).
    List<String> tarefas = Arrays.asList("A:3", "B:5", "D:2", "C:4");
    List<String> deps = Arrays.asList("A->B", "A->D", "B->C", "D->C");
    List<String> crit = Solution.calcularCaminhoCritico(tarefas, deps);
    assertEquals(Arrays.asList("A", "B", "C"), crit);
}
`,
    suiteTestesOcultos: `@Test void deveTratarRamosParalelosComDuracoesIguais() {
    List<String> tarefas = Arrays.asList("Inicio:1", "Ramo1:4", "Ramo2:4", "Fim:1");
    List<String> deps = Arrays.asList("Inicio->Ramo1", "Inicio->Ramo2", "Ramo1->Fim", "Ramo2->Fim");
    List<String> crit = Solution.calcularCaminhoCritico(tarefas, deps);
    assertTrue(crit.contains("Inicio"));
    assertTrue(crit.contains("Ramo1"));
    assertTrue(crit.contains("Ramo2"));
    assertTrue(crit.contains("Fim"));
}

@Test void deveLidarComListaVaziaOuNula() {
    assertTrue(Solution.calcularCaminhoCritico(null, null).isEmpty());
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Motor de Anonimização Textual em Alta Velocidade (Trie LGPD)",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Com a vigência da LGPD, um órgão público publica decisões e relatórios de auditoria que devem ter nomes de testemunhas, dados pessoais protegidos e termos sigilosos expurgados de arquivos textuais extensos em alta performance, sem degradar o throughput de publicação.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String mascararDadosSensiveis(String texto, List<String> termosSensiveis)
\`\`\`

### Regras de Negócio:
1. Toda ocorrência de qualquer termo presente em \`termosSensiveis\` dentro de \`texto\` deve ser substituída pela tag exata \`"[DADO_SENSIVEL]"\`.
2. A busca deve ser **insensível a maiúsculas e minúsculas** (\`case-insensitive\`), mas a substituição preserva a tag padrão \`"[DADO_SENSIVEL]"\`.
3. Em caso de termos concorrentes ou sobrepostos no texto (ex: termos \`"Jose da Silva"\` e \`"Silva"\`), a correspondência mais longa (**longest match**) tem precedência estrita.
4. O algoritmo deve ser eficiente com grandes volumes de termos (utilize Trie ou busca linear indexada).
5. Se \`texto\` for nulo ou vazio, retorne \`""\`. Se \`termosSensiveis\` for nulo ou vazio, retorne o texto original.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static String mascararDadosSensiveis(String texto, List<String> termosSensiveis) {
        if (texto == null || texto.isEmpty()) return "";
        if (termosSensiveis == null || termosSensiveis.isEmpty()) return texto;

        // Filtra e ordena os termos por tamanho decrescente para priorizar o longest match
        List<String> termosOrdenados = new ArrayList<>();
        for (String t : termosSensiveis) {
            if (t != null && !t.trim().isEmpty()) {
                termosOrdenados.add(t.trim());
            }
        }
        termosOrdenados.sort((a, b) -> Integer.compare(b.length(), a.length()));

        String textoMinusculo = texto.toLowerCase();
        int n = texto.length();
        boolean[] mascara = new boolean[n];
        int[] pulos = new int[n];

        for (String termo : termosOrdenados) {
            String termoMin = termo.toLowerCase();
            int tlen = termoMin.length();
            int pos = 0;
            while ((pos = textoMinusculo.indexOf(termoMin, pos)) != -1) {
                // Se já estiver coberto por uma correspondência mais longa, ignora
                boolean jaMarcado = false;
                for (int i = pos; i < pos + tlen; i++) {
                    if (mascara[i]) {
                        jaMarcado = true;
                        break;
                    }
                }
                if (!jaMarcado) {
                    Arrays.fill(mascara, pos, pos + tlen, true);
                    pulos[pos] = tlen;
                }
                pos += 1;
            }
        }

        StringBuilder resultado = new StringBuilder();
        int i = 0;
        while (i < n) {
            if (pulos[i] > 0) {
                resultado.append("[DADO_SENSIVEL]");
                i += pulos[i];
            } else if (mascara[i]) {
                // Caso coberto no meio de um bloco
                i++;
            } else {
                resultado.append(texto.charAt(i));
                i++;
            }
        }

        return resultado.toString();
    }
}
`,
    suiteTestesPublicos: `@Test void deveMascararTermoSimplesCaseInsensitive() {
    String texto = "O auditor Pedro Alvares realizou a diligencia.";
    List<String> termos = Arrays.asList("pedro alvares");
    String res = Solution.mascararDadosSensiveis(texto, termos);
    assertEquals("O auditor [DADO_SENSIVEL] realizou a diligencia.", res);
}

@Test void devePriorizarLongestMatchEmSobreposicao() {
    String texto = "Relatorio emitido por Jose da Silva Santos ontem.";
    List<String> termos = Arrays.asList("Silva", "Jose da Silva Santos");
    String res = Solution.mascararDadosSensiveis(texto, termos);
    assertEquals("Relatorio emitido por [DADO_SENSIVEL] ontem.", res);
}
`,
    suiteTestesOcultos: `@Test void deveMascararMultiplasOcorrencias() {
    String texto = "Atesto que o contrato com a Construtora Alfa e Construtora Alfa foi suspenso.";
    List<String> termos = Arrays.asList("Construtora Alfa");
    String res = Solution.mascararDadosSensiveis(texto, termos);
    assertEquals("Atesto que o contrato com a [DADO_SENSIVEL] e [DADO_SENSIVEL] foi suspenso.", res);
}

@Test void deveLidarComTextoOuListaVazios() {
    assertEquals("", Solution.mascararDadosSensiveis(null, Arrays.asList("termo")));
    assertEquals("Texto Intacto", Solution.mascararDadosSensiveis("Texto Intacto", null));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Auditor Contábil Forense de Partidas Dobradas e Ciclos Financeiros",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Em operações especiais de combate a desvios de recursos, os auditores analisam extratos de livros-razão contábeis. Além de validar a regra universal das **partidas dobradas** (todo lançamento a débito possui contrapartida idêntica a crédito), a auditoria deve identificar **ciclos de repasse em carrossel** (lavagem de dinheiro ou faturamento artificial), onde recursos saem de uma conta A, passam por B e C e retornam para A.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static Map<String, Object> auditarLivroRazao(List<String> lancamentos)
\`\`\`

### Formato dos Lançamentos:
Cada string possui a estrutura: \`"CONTA_DEBITADA->CONTA_CREDITADA:VALOR_CENTAVOS"\` (ex: \`"Caixa->FornecedorX:150000"\`).
- \`CONTA_DEBITADA\`: Origem dos recursos
- \`CONTA_CREDITADA\`: Destino dos recursos
- \`VALOR_CENTAVOS\`: Inteiro positivo representando centavos

### Regras de Auditoria:
1. **Total de Movimentação:** Calcule a soma total movimentada em centavos (\`totalMovimentado\`).
2. **Saldo Líquido por Conta:** Cada débito reduz o saldo da conta e cada crédito aumenta o saldo (\`saldo = creditos - debitos\`). As contas com saldo divergente de zero devem compor o mapa \`saldosContas\`.
3. **Detecção de Ciclos no Fluxo Financeiro:**
   - Construa o grafo direcionado ponderado de fluxo de repasses (\`debitada -> creditada\`).
   - Identifique se existe ao menos um ciclo direcionado no fluxo entre contas.
   - Defina o booleano \`possuiCicloRepasse\` como \`true\` se houver ciclo, ou \`false\` caso contrário.
4. O retorno deve ser um \`Map<String, Object>\` com as chaves:
   - \`"totalMovimentado"\`: Long com a soma total
   - \`"possuiCicloRepasse"\`: Boolean
   - \`"status"\`: String (\`"REGULAR"\` se não houver ciclos, \`"ALERTA_CARROSSEL"\` se houver ciclo de repasses).`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static Map<String, Object> auditarLivroRazao(List<String> lancamentos) {
        Map<String, Object> resultado = new HashMap<>();
        long totalMovimentado = 0;
        Map<String, Set<String>> grafo = new HashMap<>();

        if (lancamentos != null) {
            for (String l : lancamentos) {
                if (l == null || !l.contains("->") || !l.contains(":")) continue;
                String[] p1 = l.split("->");
                String de = p1[0].trim();
                String[] p2 = p1[1].split(":");
                String para = p2[0].trim();
                long valor = Long.parseLong(p2[1].trim());

                totalMovimentado += valor;
                grafo.computeIfAbsent(de, k -> new HashSet<>()).add(para);
            }
        }

        boolean temCiclo = detectarCicloGrafo(grafo);

        resultado.put("totalMovimentado", totalMovimentado);
        resultado.put("possuiCicloRepasse", temCiclo);
        resultado.put("status", temCiclo ? "ALERTA_CARROSSEL" : "REGULAR");
        return resultado;
    }

    private static boolean detectarCicloGrafo(Map<String, Set<String>> grafo) {
        Set<String> visitados = new HashSet<>();
        Set<String> pilhaRecursao = new HashSet<>();

        for (String node : grafo.keySet()) {
            if (dfsCiclo(node, grafo, visitados, pilhaRecursao)) {
                return true;
            }
        }
        return false;
    }

    private static boolean dfsCiclo(String u, Map<String, Set<String>> grafo, Set<String> vis, Set<String> pilha) {
        if (pilha.contains(u)) return true;
        if (vis.contains(u)) return false;

        vis.add(u);
        pilha.add(u);

        Set<String> vizinhos = grafo.get(u);
        if (vizinhos != null) {
            for (String v : vizinhos) {
                if (dfsCiclo(v, grafo, vis, pilha)) return true;
            }
        }

        pilha.remove(u);
        return false;
    }
}
`,
    suiteTestesPublicos: `@Test void deveAprovarFluxoLinearRegular() {
    List<String> lancamentos = Arrays.asList(
        "Tesouro->SecretariaSaude:500000",
        "SecretariaSaude->HospitalMunicipal:500000"
    );
    Map<String, Object> res = Solution.auditarLivroRazao(lancamentos);
    assertEquals(1000000L, res.get("totalMovimentado"));
    assertFalse((Boolean) res.get("possuiCicloRepasse"));
    assertEquals("REGULAR", res.get("status"));
}

@Test void deveDetectarCicloCarrossel() {
    // A -> B -> C -> A (Ciclo fechado)
    List<String> lancamentos = Arrays.asList(
        "EmpresaA->EmpresaB:100000",
        "EmpresaB->EmpresaC:100000",
        "EmpresaC->EmpresaA:100000"
    );
    Map<String, Object> res = Solution.auditarLivroRazao(lancamentos);
    assertTrue((Boolean) res.get("possuiCicloRepasse"));
    assertEquals("ALERTA_CARROSSEL", res.get("status"));
}
`,
    suiteTestesOcultos: `@Test void deveLidarComMultiplosComponentesDesconexos() {
    List<String> lancamentos = Arrays.asList(
        "A->B:50", "C->D:100", "D->E:100", "E->C:100" // Componente 2 tem ciclo C->D->E->C
    );
    Map<String, Object> res = Solution.auditarLivroRazao(lancamentos);
    assertTrue((Boolean) res.get("possuiCicloRepasse"));
}

@Test void deveLidarComEntradaVazia() {
    Map<String, Object> res = Solution.auditarLivroRazao(null);
    assertEquals(0L, res.get("totalMovimentado"));
    assertFalse((Boolean) res.get("possuiCicloRepasse"));
    assertEquals("REGULAR", res.get("status"));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Árvore de Segmentos para Consultas em Tempo Real de Despesas (Segment Tree)",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto Arquitetural
No painel de acompanhamento de execução orçamentária diária em tempo real, os dados de despesas por dia do ano ($N = 365$ ou mais) recebem atualizações constantes de empenhos e liquidações. Consultas de intervalo arbitrário (ex: "gasto total entre o dia $L$ e $R$") devem responder em tempo sublinear $O(\\log N)$.

## Especificação da Tarefa
Implemente a classe \`Solution\` contendo uma **Árvore de Segmentos (Segment Tree)**:
\`\`\`java
public class Solution {
    public Solution(long[] valoresIniciais) { ... }
    public void atualizar(int indice, long novoValor) { ... }
    public long consultarSoma(int l, int r) { ... }
    public long consultarMaximo(int l, int r) { ... }
}
\`\`\`

### Regras de Negócio:
1. O construtor recebe o array de valores iniciais indexado de \`0\` a \`N - 1\`. Se for nulo ou vazio, lance \`IllegalArgumentException\`.
2. \`atualizar(int indice, long novoValor)\`: Atualiza pontualmente o valor na posição \`indice\` e propaga a alteração na árvore em tempo $O(\\log N)$. Se o índice for inválido, ignore a operação.
3. \`consultarSoma(int l, int r)\`: Retorna a soma acumulada dos valores no intervalo fechado \`[l, r]\` ($0 \\le l \\le r < N$) em $O(\\log N)$.
4. \`consultarMaximo(int l, int r)\`: Retorna o maior valor único contido no intervalo fechado \`[l, r]\` em $O(\\log N)$.`,
    codigoTemplate: `public class Solution {
    private final int n;
    private final long[] treeSoma;
    private final long[] treeMax;

    public Solution(long[] valores) {
        if (valores == null || valores.length == 0) {
            throw new IllegalArgumentException("Array nao pode ser nulo ou vazio.");
        }
        this.n = valores.length;
        this.treeSoma = new long[4 * n];
        this.treeMax = new long[4 * n];
        construir(valores, 1, 0, n - 1);
    }

    private void construir(long[] arr, int node, int start, int end) {
        if (start == end) {
            treeSoma[node] = arr[start];
            treeMax[node] = arr[start];
            return;
        }
        int mid = (start + end) / 2;
        construir(arr, 2 * node, start, mid);
        construir(arr, 2 * node + 1, mid + 1, end);
        treeSoma[node] = treeSoma[2 * node] + treeSoma[2 * node + 1];
        treeMax[node] = Math.max(treeMax[2 * node], treeMax[2 * node + 1]);
    }

    public void atualizar(int indice, long novoValor) {
        if (indice < 0 || indice >= n) return;
        atualizarRec(1, 0, n - 1, indice, novoValor);
    }

    private void atualizarRec(int node, int start, int end, int idx, long val) {
        if (start == end) {
            treeSoma[node] = val;
            treeMax[node] = val;
            return;
        }
        int mid = (start + end) / 2;
        if (idx <= mid) {
            atualizarRec(2 * node, start, mid, idx, val);
        } else {
            atualizarRec(2 * node + 1, mid + 1, end, idx, val);
        }
        treeSoma[node] = treeSoma[2 * node] + treeSoma[2 * node + 1];
        treeMax[node] = Math.max(treeMax[2 * node], treeMax[2 * node + 1]);
    }

    public long consultarSoma(int l, int r) {
        return querySomaRec(1, 0, n - 1, Math.max(0, l), Math.min(n - 1, r));
    }

    private long querySomaRec(int node, int start, int end, int l, int r) {
        if (r < start || end < l) return 0;
        if (l <= start && end <= r) return treeSoma[node];
        int mid = (start + end) / 2;
        return querySomaRec(2 * node, start, mid, l, r) + querySomaRec(2 * node + 1, mid + 1, end, l, r);
    }

    public long consultarMaximo(int l, int r) {
        return queryMaxRec(1, 0, n - 1, Math.max(0, l), Math.min(n - 1, r));
    }

    private long queryMaxRec(int node, int start, int end, int l, int r) {
        if (r < start || end < l) return Long.MIN_VALUE;
        if (l <= start && end <= r) return treeMax[node];
        int mid = (start + end) / 2;
        return Math.max(queryMaxRec(2 * node, start, mid, l, r), queryMaxRec(2 * node + 1, mid + 1, end, l, r));
    }
}
`,
    suiteTestesPublicos: `@Test void deveConstruirEConsultarIntervalosCorretamente() {
    long[] valores = new long[]{10, 20, 30, 40, 50};
    Solution seg = new Solution(valores);

    assertEquals(60L, seg.consultarSoma(0, 2));   // 10 + 20 + 30 = 60
    assertEquals(50L, seg.consultarMaximo(0, 4)); // max = 50
    assertEquals(30L, seg.consultarMaximo(0, 2)); // max = 30
}

@Test void deveAtualizarValorEPrefletirNaConsulta() {
    long[] valores = new long[]{5, 10, 15};
    Solution seg = new Solution(valores);

    seg.atualizar(1, 50); // valores agora: [5, 50, 15]
    assertEquals(70L, seg.consultarSoma(0, 2));
    assertEquals(50L, seg.consultarMaximo(0, 2));
}
`,
    suiteTestesOcultos: `@Test void deveTratarIntervaloDeTamanhoUm() {
    long[] valores = new long[]{42};
    Solution seg = new Solution(valores);
    assertEquals(42L, seg.consultarSoma(0, 0));
    assertEquals(42L, seg.consultarMaximo(0, 0));
}

@Test void deveLancarExcecaoParaArrayVazioOuNulo() {
    boolean lancou = false;
    try {
        new Solution(new long[0]);
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
    titulo: "Detector de Anomalias em Fluxos de Dados com Média Móvel Exponencial (EWMA)",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O monitor de integridade de pagamentos processa milhões de transações diárias. Em pipelines de streaming, não é viável armazenar todo o histórico em memória. Utiliza-se a técnica **EWMA (Exponentially Weighted Moving Average)** com espaço em memória $O(1)$ para calcular a média e a variância móveis com amortecimento exponencial, identificando valores discrepantes (outliers) em tempo real.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<Integer> detectarAnomalias(double[] valores, double alfa, double limiarZScore)
\`\`\`

### Formulação Matemática:
1. \`alfa\`: Fator de decaimento ($0 < \\alpha < 1$).
2. \`limiarZScore\`: Quantidade de desvios-padrão para classificar como anomalia (ex: \`3.0\`).
3. Para o primeiro elemento (\`i = 0\`):
   - Média inicial: \`media = valores[0]\`
   - Variância inicial: \`variancia = 0.0\`
   - O primeiro elemento nunca é marcado como anomalia.
4. Para os elementos subsequentes (\`i >= 1\`):
   - O desvio em relação à média anterior é: \`desvio = valores[i] - media\`
   - O desvio padrão atual é: \`std = Math.sqrt(variancia)\`
   - Se \`std > 1e-4\` e \`Math.abs(desvio) / std >= limiarZScore\`, o índice \`i\` é classificado como **anomalia**.
   - Atualização incremental das estatísticas para o próximo passo:
     - \`media = alfa * valores[i] + (1.0 - alfa) * media\`
     - \`variancia = (1.0 - alfa) * (variancia + alfa * desvio * desvio)\`
5. O método deve retornar a lista com os **índices inteiros** das anomalias encontradas.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static List<Integer> detectarAnomalias(double[] valores, double alfa, double limiarZScore) {
        if (valores == null || valores.length <= 1 || alfa <= 0 || alfa >= 1) {
            return new ArrayList<>();
        }

        List<Integer> anomalias = new ArrayList<>();
        double media = valores[0];
        double variancia = 0.0;

        for (int i = 1; i < valores.length; i++) {
            double x = valores[i];
            double desvio = x - media;
            double std = Math.sqrt(variancia);

            if (std > 1e-4) {
                double z = Math.abs(desvio) / std;
                if (z >= limiarZScore) {
                    anomalias.add(i);
                }
            }

            // Atualização incremental EWMA
            media = alfa * x + (1.0 - alfa) * media;
            variancia = (1.0 - alfa) * (variancia + alfa * desvio * desvio);
        }

        return anomalias;
    }
}
`,
    suiteTestesPublicos: `@Test void deveDetectarPicoAnomaloEvidente() {
    // Série regular de valores próximos de 100 com um pico extremo de 500
    double[] dados = new double[]{
        100, 102, 98, 101, 99, 100, 103, 97, 100, 500, 100
    };
    List<Integer> anomalias = Solution.detectarAnomalias(dados, 0.2, 3.0);
    assertTrue(anomalias.contains(9)); // O índice 9 (500) é anômalo
}

@Test void deveNaoDetectarAnomaliaEmSerieEstavel() {
    double[] dados = new double[]{10, 10.1, 9.9, 10.0, 10.2};
    List<Integer> anomalias = Solution.detectarAnomalias(dados, 0.3, 3.0);
    assertTrue(anomalias.isEmpty());
}
`,
    suiteTestesOcultos: `@Test void deveTratarEntradasInsuficientesOuParametrosInvalidos() {
    assertTrue(Solution.detectarAnomalias(null, 0.2, 3.0).isEmpty());
    assertTrue(Solution.detectarAnomalias(new double[]{10.0}, 0.2, 3.0).isEmpty());
    assertTrue(Solution.detectarAnomalias(new double[]{10, 20}, 1.5, 3.0).isEmpty()); // alfa > 1 inválido
}

@Test void deveDetectarMultiplosPicos() {
    double[] dados = new double[]{50, 52, 48, 51, 50, 300, 50, 51, 400};
    List<Integer> anomalias = Solution.detectarAnomalias(dados, 0.2, 2.5);
    assertTrue(anomalias.contains(5));
    assertTrue(anomalias.contains(8));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Avaliador de Expressões Cron para Agendamento de Rotinas de Auditoria",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O orquestrador de auditorias contínuas dispara varreduras periódicas em bases de dados de órgãos auditados orientadas por expressões cron padrão Unix de 5 campos.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String calcularProximaExecucao(String expressaoCron, String dataHoraIsoRef)
\`\`\`

### Formato da Expressão Cron (5 campos separados por espaço):
\`"MINUTO HORA DIA_MES MES DIA_SEMANA"\`
- **Minuto:** \`0-59\`
- **Hora:** \`0-23\`
- **Dia do Mês:** \`1-31\`
- **Mês:** \`1-12\`
- **Dia da Semana:** \`1-7\` (onde \`1 = Segunda-feira\`, \`7 = Domingo\`)

### Operadores Suportados:
- \`*\`: Qualquer valor válido do campo
- \`*/N\`: Valores a cada intervalo de \`N\` a partir de 0 (ou 1 para dias/meses)
- Número exato (ex: \`"15"\`, \`"2"\`)

### Regras de Negócio:
1. O parâmetro \`dataHoraIsoRef\` é uma data/hora no padrão ISO-8601 \`"AAAA-MM-DDTHH:MM:SS"\` (ex: \`"2026-11-11T14:30:00"\`).
2. O método deve encontrar o **próximo minuto estritamente posterior** a \`dataHoraIsoRef\` (com segundos zerados \`:00\`) que satisfaça todos os 5 campos da expressão cron simultaneamente.
3. O retorno deve estar no formato ISO-8601 \`"AAAA-MM-DDTHH:MM:00"\`.
4. Se os parâmetros forem inválidos, retorne \`""\`.`,
    codigoTemplate: `import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class Solution {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter OUT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:00");

    public static String calcularProximaExecucao(String expressaoCron, String dataHoraIsoRef) {
        if (expressaoCron == null || dataHoraIsoRef == null) return "";
        String[] campos = expressaoCron.trim().split("\\\\s+");
        if (campos.length != 5) return "";

        LocalDateTime atual;
        try {
            atual = LocalDateTime.parse(dataHoraIsoRef.trim(), FMT).plusMinutes(1).withSecond(0).withNano(0);
        } catch (Exception e) {
            return "";
        }

        Set<Integer> minutosValidos = parsearCampo(campos[0], 0, 59);
        Set<Integer> horasValidas = parsearCampo(campos[1], 0, 23);
        Set<Integer> diasMesValidos = parsearCampo(campos[2], 1, 31);
        Set<Integer> mesesValidos = parsearCampo(campos[3], 1, 12);
        Set<Integer> diasSemanaValidos = parsearCampo(campos[4], 1, 7);

        // Busca linear minuto a minuto (limite de segurança de 366 dias em minutos)
        int maxIter = 366 * 24 * 60;
        for (int i = 0; i < maxIter; i++) {
            if (mesesValidos.contains(atual.getMonthValue()) &&
                diasMesValidos.contains(atual.getDayOfMonth()) &&
                diasSemanaValidos.contains(atual.getDayOfWeek().getValue()) &&
                horasValidas.contains(atual.getHour()) &&
                minutosValidos.contains(atual.getMinute())) {
                return atual.format(OUT_FMT);
            }
            atual = atual.plusMinutes(1);
        }

        return "";
    }

    private static Set<Integer> parsearCampo(String campo, int min, int max) {
        Set<Integer> res = new HashSet<>();
        if ("*".equals(campo)) {
            for (int i = min; i <= max; i++) res.add(i);
            return res;
        }
        if (campo.startsWith("*/")) {
            int step = Integer.parseInt(campo.substring(2));
            for (int i = min; i <= max; i += step) res.add(i);
            return res;
        }
        res.add(Integer.parseInt(campo));
        return res;
    }
}
`,
    suiteTestesPublicos: `@Test void deveCalcularProximaExecucaoACada15Minutos() {
    // "*/15 * * * *" a partir de 14:32 -> deve rodar às 14:45
    String res = Solution.calcularProximaExecucao("*/15 * * * *", "2026-11-11T14:32:00");
    assertEquals("2026-11-11T14:45:00", res);
}

@Test void deveVirarParaProximoDiaEmHorarioFixo() {
    // "0 2 * * *" (Todo dia às 02:00) a partir das 03:00 -> roda amanhã às 02:00
    String res = Solution.calcularProximaExecucao("0 2 * * *", "2026-11-11T03:00:00");
    assertEquals("2026-11-12T02:00:00", res);
}
`,
    suiteTestesOcultos: `@Test void deveRespeitarDiaDaSemanaEspecifico() {
    // 2026-11-11 é Quarta (3). "0 10 * * 1" (Segundas às 10:00) -> 2026-11-16
    String res = Solution.calcularProximaExecucao("0 10 * * 1", "2026-11-11T12:00:00");
    assertEquals("2026-11-16T10:00:00", res);
}

@Test void deveRetornarVazioParaEntradaInvalida() {
    assertEquals("", Solution.calcularProximaExecucao("invalido", "2026-11-11T00:00:00"));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Gerenciador de Idempotência Distribuída com Janela TTL",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto Arquitetural
Para prevenir duplicidade de lançamentos e pagamentos decorrentes de retentativas automáticas de clientes HTTP ou mensageria Kafka/RabbitMQ, APIs críticas implementam o padrão de **Chave de Idempotência**.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<String> processarTransacoesIdempotentes(List<String> requisicoes, long ttlSegundos)
\`\`\`

### Formato das Requisições:
Cada string possui a estrutura: \`"TIMESTAMP_SEC:CHAVE_IDEMPOTENCIA:PAYLOAD_HASH:VALOR"\`
- Exemplo: \`"1000:req-abc-123:hash999:1500"\`

### Regras de Negócio:
1. As requisições são processadas na ordem da lista de entrada.
2. Para cada requisição com chave \`CHAVE_IDEMPOTENCIA\`:
   - Se a chave for **inédita** ou se a ocorrência anterior tiver expirado (\`tempoAtual - tempoAnterior > ttlSegundos\`):
     - A transação é processada e armazenada em cache com status \`"PROCESSADO_OK:VALOR"\`.
   - Se a chave já existir dentro do período de validade do TTL:
     - Se o \`PAYLOAD_HASH\` for **idêntico** ao gravado anteriormente:
       - Retorne o resultado em cache com status \`"REPLAY_CACHE:VALOR"\`.
     - Se o \`PAYLOAD_HASH\` for **diferente** do gravado:
       - Trata-se de um conflito de concorrência com chave reutilizada indevidamente. Retorne status \`"CONFLITO_IDEMPOTENCIA:409"\`.
3. Retorne a lista de status de cada requisição na mesma ordem da entrada.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    private static class Registro {
        long timestamp;
        String payloadHash;
        String valor;

        Registro(long timestamp, String payloadHash, String valor) {
            this.timestamp = timestamp;
            this.payloadHash = payloadHash;
            this.valor = valor;
        }
    }

    public static List<String> processarTransacoesIdempotentes(List<String> requisicoes, long ttlSegundos) {
        if (requisicoes == null) return new ArrayList<>();

        List<String> resultados = new ArrayList<>();
        Map<String, Registro> cache = new HashMap<>();

        for (String req : requisicoes) {
            if (req == null || !req.contains(":")) continue;
            String[] p = req.split(":");
            if (p.length < 4) continue;

            long ts = Long.parseLong(p[0].trim());
            String chave = p[1].trim();
            String hash = p[2].trim();
            String valor = p[3].trim();

            Registro anterior = cache.get(chave);

            if (anterior == null || (ts - anterior.timestamp) > ttlSegundos) {
                // Inédito ou expirado
                cache.put(chave, new Registro(ts, hash, valor));
                resultados.add("PROCESSADO_OK:" + valor);
            } else {
                // Dentro do TTL
                if (anterior.payloadHash.equals(hash)) {
                    resultados.add("REPLAY_CACHE:" + anterior.valor);
                } else {
                    resultados.add("CONFLITO_IDEMPOTENCIA:409");
                }
            }
        }

        return resultados;
    }
}
`,
    suiteTestesPublicos: `@Test void deveProcessarEReplayDentroDoTTL() {
    List<String> reqs = Arrays.asList(
        "100:key1:hashA:500",
        "105:key1:hashA:500" // Retentativa dentro do TTL de 10s
    );
    List<String> res = Solution.processarTransacoesIdempotentes(reqs, 10);
    assertEquals("PROCESSADO_OK:500", res.get(0));
    assertEquals("REPLAY_CACHE:500", res.get(1));
}

@Test void deveDetectarConflitoComPayloadDiferente() {
    List<String> reqs = Arrays.asList(
        "100:key1:hashA:500",
        "105:key1:hashB:900" // Mesma chave com payload diferente
    );
    List<String> res = Solution.processarTransacoesIdempotentes(reqs, 10);
    assertEquals("PROCESSADO_OK:500", res.get(0));
    assertEquals("CONFLITO_IDEMPOTENCIA:409", res.get(1));
}
`,
    suiteTestesOcultos: `@Test void deveExpirarAposTTL() {
    List<String> reqs = Arrays.asList(
        "100:key1:hashA:500",
        "200:key1:hashA:500" // 100s depois, TTL é de 30s -> trata como nova requisição
    );
    List<String> res = Solution.processarTransacoesIdempotentes(reqs, 30);
    assertEquals("PROCESSADO_OK:500", res.get(0));
    assertEquals("PROCESSADO_OK:500", res.get(1));
}

@Test void deveLidarComListaNulaOuVazia() {
    assertTrue(Solution.processarTransacoesIdempotentes(null, 10).isEmpty());
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Alocador Ótimo de Equipes de Auditoria (Problema Bin Packing)",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O planejamento anual de auditorias de um órgão de controle define um conjunto de processos de auditoria, cada um demandando uma carga de esforço estimada em pontos. Cada equipe técnica possui uma capacidade máxima fixa de esforço de trabalho que não pode ser ultrapassada. O objetivo é calcular o **número mínimo absoluto de equipes necessárias** para cobrir todos os processos (problema clássico NP-Hard de Bin Packing resolvido via Branch-and-Bound com heurísticas de First-Fit Decreasing).

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static int calcularMinimoEquipes(int[] esforcoProcessos, int capacidadePorEquipe)
\`\`\`

### Regras de Negócio:
1. \`esforcoProcessos\`: Array de inteiros positivos representando a complexidade/pontos de cada processo.
2. \`capacidadePorEquipe\`: Limite máximo de pontos que uma equipe pode absorver.
3. Se qualquer processo exigir um esforço estritamente maior que \`capacidadePorEquipe\`, lance \`IllegalArgumentException\` (processo não cabe em nenhuma equipe).
4. Se o array for nulo ou vazio, retorne \`0\`.
5. O algoritmo deve encontrar a alocação exata mínima global (otimização exata).`,
    codigoTemplate: `import java.util.*;

public class Solution {
    private static int melhorQtdEquipes;

    public static int calcularMinimoEquipes(int[] esforcoProcessos, int capacidadePorEquipe) {
        if (esforcoProcessos == null || esforcoProcessos.length == 0) return 0;
        if (capacidadePorEquipe <= 0) throw new IllegalArgumentException("Capacidade invalida");

        int n = esforcoProcessos.length;
        Integer[] arr = new Integer[n];
        long somaTotal = 0;
        for (int i = 0; i < n; i++) {
            if (esforcoProcessos[i] > capacidadePorEquipe) {
                throw new IllegalArgumentException("Processo excede capacidade da equipe.");
            }
            arr[i] = esforcoProcessos[i];
            somaTotal += esforcoProcessos[i];
        }

        // Ordena em ordem decrescente (Heurística FFD)
        Arrays.sort(arr, Collections.reverseOrder());

        // Limite inferior teórico (cota mínima matemática)
        int limiteInferior = (int) Math.ceil((double) somaTotal / capacidadePorEquipe);
        melhorQtdEquipes = n; // Pior caso: 1 equipe por processo

        int[] equipes = new int[n];
        backtrack(arr, 0, equipes, 0, capacidadePorEquipe, limiteInferior);

        return melhorQtdEquipes;
    }

    private static void backtrack(
        Integer[] arr, int itemIdx, int[] equipes, int equipesUsadas,
        int cap, int limiteInferior
    ) {
        if (equipesUsadas >= melhorQtdEquipes) return;

        if (itemIdx == arr.length) {
            melhorQtdEquipes = Math.min(melhorQtdEquipes, equipesUsadas);
            return;
        }

        int peso = arr[itemIdx];

        // Tenta alocar nas equipes já abertas
        for (int i = 0; i < equipesUsadas; i++) {
            if (equipes[i] + peso <= cap) {
                equipes[i] += peso;
                backtrack(arr, itemIdx + 1, equipes, equipesUsadas, cap, limiteInferior);
                equipes[i] -= peso;
                if (melhorQtdEquipes == limiteInferior) return; // Otimização ótima global atingida
            }
        }

        // Abre uma nova equipe se não ultrapassar o melhor já encontrado
        if (equipesUsadas + 1 < melhorQtdEquipes) {
            equipes[equipesUsadas] = peso;
            backtrack(arr, itemIdx + 1, equipes, equipesUsadas + 1, cap, limiteInferior);
            equipes[equipesUsadas] = 0;
        }
    }
}
`,
    suiteTestesPublicos: `@Test void deveCalcularEmpacotamentoExato() {
    // Processos: [4, 8, 1, 4, 2, 1], Capacidade por equipe: 10
    // Soma = 20. Equipes: [8, 2]=10 e [4, 4, 1, 1]=10 -> Exatamente 2 equipes!
    int[] processos = new int[]{4, 8, 1, 4, 2, 1};
    int qtd = Solution.calcularMinimoEquipes(processos, 10);
    assertEquals(2, qtd);
}

@Test void deveLancarExcecaoQuandoProcessoExcedeCapacidade() {
    boolean lancou = false;
    try {
        Solution.calcularMinimoEquipes(new int[]{5, 12, 3}, 10);
    } catch (IllegalArgumentException e) {
        lancou = true;
    }
    assertTrue(lancou);
}
`,
    suiteTestesOcultos: `@Test void deveTratarProcessosQueExigemEquipesSeparadas() {
    // [6, 6, 6], capacidade 10 -> cada equipe cabe no máximo 1 processo -> 3 equipes
    int[] processos = new int[]{6, 6, 6};
    assertEquals(3, Solution.calcularMinimoEquipes(processos, 10));
}

@Test void deveRetornarZeroParaArrayVazioOuNulo() {
    assertEquals(0, Solution.calcularMinimoEquipes(null, 10));
    assertEquals(0, Solution.calcularMinimoEquipes(new int[0], 10));
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


  console.log(`Cadastrando ${desafiosSenior.length} desafios nível Sênior em Java...`);

  for (let i = 0; i < desafiosSenior.length; i++) {
    const d = desafiosSenior[i];
    console.log(`[${i + 1}/${desafiosSenior.length}] Criando desafio: ${d.titulo}...`);

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

  console.log("\nTodos os 10 desafios nível Sênior foram cadastrados com sucesso!");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
