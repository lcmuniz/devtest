const { Pool } = require("pg");
const crypto = require("crypto");
const { templatesPorTitulo } = require("./atualizar-templates-desafios");

// 1. Desafios Junior (5 desafios)
const desafiosJunior = [
  {
    titulo: "Validador de CPF com Verificação de Dígitos (Módulo 11)",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Em sistemas cadastrais corporativos e públicos, a validação de consistência matemática do Cadastro de Pessoas Físicas (CPF) é etapa obrigatória para prevenção de fraudes e erros de digitação.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static boolean validarCPF(String cpf)
\`\`\`

### Regras de Negócio:
1. **Sanitização:** O parâmetro \`cpf\` pode vir formatado com pontuação (ex: \`"529.982.247-25"\`) ou apenas com dígitos (ex: \`"52998224725"\`). Todos os caracteres não numéricos devem ser ignorados.
2. **Nulo ou Tamanho Inválido:** Se a entrada for \`null\` ou se a sequência numérica resultante não tiver exatamente 11 dígitos, retorne \`false\`.
3. **Dígitos Repetidos:** Sequências com 11 dígitos idênticos (ex: \`"00000000000"\`, \`"11111111111"\`, ..., \`"99999999999"\`) são inválidas segundo a Receita Federal e devem retornar \`false\`.
4. **Primeiro Dígito Verificador (D1):**
   - Multiplique os primeiros 9 dígitos pelos pesos decrescentes de 10 a 2.
   - Some os produtos. Calcule \`resto = (soma * 10) % 11\`.
   - Se \`resto == 10\` ou \`resto == 11\`, o dígito esperado é \`0\`.
   - Caso o dígito calculado seja diferente do 10º dígito do CPF, retorne \`false\`.
5. **Segundo Dígito Verificador (D2):**
   - Multiplique os primeiros 10 dígitos pelos pesos decrescentes de 11 a 2.
   - Some os produtos. Calcule \`resto = (soma * 10) % 11\`.
   - Se \`resto == 10\` ou \`resto == 11\`, o dígito esperado é \`0\`.
   - Caso o dígito calculado seja diferente do 11º dígito do CPF, retorne \`false\`.
6. Retorne \`true\` se e somente se ambos os dígitos verificadores forem válidos.`,
    codigoTemplate: `public class Solution {
    public static boolean validarCPF(String cpf) {
        if (cpf == null) return false;
        String limpo = cpf.replaceAll("[^0-9]", "");
        if (limpo.length() != 11) return false;
        if (limpo.matches("(\\\\d)\\\\1{10}")) return false;

        int soma1 = 0;
        for (int i = 0; i < 9; i++) {
            soma1 += (limpo.charAt(i) - '0') * (10 - i);
        }
        int resto1 = (soma1 * 10) % 11;
        if (resto1 == 10 || resto1 == 11) resto1 = 0;
        if (resto1 != (limpo.charAt(9) - '0')) return false;

        int soma2 = 0;
        for (int i = 0; i < 10; i++) {
            soma2 += (limpo.charAt(i) - '0') * (11 - i);
        }
        int resto2 = (soma2 * 10) % 11;
        if (resto2 == 10 || resto2 == 11) resto2 = 0;
        if (resto2 != (limpo.charAt(10) - '0')) return false;

        return true;
    }
}
`,
    suiteTestesPublicos: `@Test void deveValidarCpfValidoComMascara() {
    assertTrue(Solution.validarCPF("529.982.247-25"));
}

@Test void deveRejeitarCpfComDigitosRepetidos() {
    assertFalse(Solution.validarCPF("111.111.111-11"));
}
`,
    suiteTestesOcultos: `@Test void deveValidarCpfSemMascara() {
    assertTrue(Solution.validarCPF("11144477735"));
}

@Test void deveRejeitarCpfComDigitoInvalido() {
    assertFalse(Solution.validarCPF("52998224726"));
}

@Test void deveRejeitarNuloOuIncompleto() {
    assertFalse(Solution.validarCPF(null));
    assertFalse(Solution.validarCPF("12345"));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  },
  {
    titulo: "Cálculo de Desconto Progressivo Previdenciário (INSS)",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O cálculo de contribuição previdenciária em folha de pagamento utiliza alíquotas progressivas incidentes sobre faixas salariais específicas, e não sobre o montante global.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static double calcularINSS(double salarioBruto)
\`\`\`

### Faixas de Contribuição:
- **Faixa 1:** Até R$ 1.412,00 -> Alíquota de **7,5%**
- **Faixa 2:** De R$ 1.412,01 até R$ 2.666,68 -> Alíquota de **9,0%** (sobre a diferença desta faixa)
- **Faixa 3:** De R$ 2.666,69 até R$ 4.000,03 -> Alíquota de **12,0%** (sobre a diferença desta faixa)
- **Faixa 4:** De R$ 4.000,04 até o Teto de R$ 7.786,02 -> Alíquota de **14,0%** (sobre a diferença até o teto)
- **Acima do Teto:** Para qualquer salário superior a R$ 7.786,02, o desconto não pode ultrapassar o teto máximo da Faixa 4.

### Regras de Negócio:
1. Se \`salarioBruto <= 0.0\`, retorne \`0.0\`.
2. O resultado final deve ser arredondado para duas casas decimais (\`Math.round(valor * 100.0) / 100.0\`).`,
    codigoTemplate: `public class Solution {
    public static double calcularINSS(double salarioBruto) {
        if (salarioBruto <= 0.0) return 0.0;
        double base = Math.min(salarioBruto, 7786.02);
        double total = 0.0;

        if (base > 0) {
            double f1 = Math.min(base, 1412.00);
            total += f1 * 0.075;
        }
        if (base > 1412.00) {
            double f2 = Math.min(base, 2666.68) - 1412.00;
            total += f2 * 0.09;
        }
        if (base > 2666.68) {
            double f3 = Math.min(base, 4000.03) - 2666.68;
            total += f3 * 0.12;
        }
        if (base > 4000.03) {
            double f4 = base - 4000.03;
            total += f4 * 0.14;
        }

        return Math.round(total * 100.0) / 100.0;
    }
}
`,
    suiteTestesPublicos: `@Test void deveCalcularPrimeiraFaixa() {
    double inss = Solution.calcularINSS(1000.00);
    assertEquals(Double.valueOf(75.0), Double.valueOf(inss));
}

@Test void deveCalcularSegundaFaixa() {
    double inss = Solution.calcularINSS(2000.00);
    assertTrue(Math.abs(inss - 158.82) <= 0.05);
}
`,
    suiteTestesOcultos: `@Test void deveAplicarTetoMaximoAcimaDe7786() {
    double teto = Solution.calcularINSS(15000.00);
    double tetoExato = Solution.calcularINSS(7786.02);
    assertEquals(Double.valueOf(tetoExato), Double.valueOf(teto));
}

@Test void deveRetornarZeroParaSalarioNegativoOuZero() {
    assertEquals(Double.valueOf(0.0), Double.valueOf(Solution.calcularINSS(0.0)));
    assertEquals(Double.valueOf(0.0), Double.valueOf(Solution.calcularINSS(-200.0)));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  },
  {
    titulo: "Formatador e Padronizador de Nomes Próprios",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Sistemas de inscrição e emissão de diplomas exigem que nomes próprios sejam exibidos de maneira padronizada, eliminando espaços excessivos e respeitando convenções gramaticais.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String formatarNome(String nomeCompleto)
\`\`\`

### Regras de Negócio:
1. Elimine espaços extras no início, no fim e reduza múltiplos espaços internos consecutivos a um único espaço.
2. Cada palavra deve começar com letra maiúscula e ter o restante em minúsculo (ex: \`"CARLOS ALBERTO"\` -> \`"Carlos Alberto"\`).
3. As preposições e conjunções gramaticais da língua portuguesa (\`"de"\`, \`"da"\`, \`"do"\`, \`"das"\`, \`"dos"\`, \`"e"\`) devem permanecer estritamente em minúsculas, **exceto** se forem a primeira palavra do nome.
4. Se o parâmetro \`nomeCompleto\` for \`null\` ou contiver apenas espaços em branco, retorne uma string vazia \`""\`.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    private static final Set<String> PREPOSICOES = new HashSet<>(Arrays.asList("de", "da", "do", "das", "dos", "e"));

    public static String formatarNome(String nomeCompleto) {
        if (nomeCompleto == null) return "";
        String limpo = nomeCompleto.trim().replaceAll("\\\\s+", " ");
        if (limpo.isEmpty()) return "";

        String[] palavras = limpo.split(" ");
        StringBuilder resultado = new StringBuilder();

        for (int i = 0; i < palavras.length; i++) {
            String p = palavras[i].toLowerCase();
            if (i > 0 && PREPOSICOES.contains(p)) {
                resultado.append(p);
            } else {
                resultado.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
            }
            if (i < palavras.length - 1) {
                resultado.append(" ");
            }
        }
        return resultado.toString();
    }
}
`,
    suiteTestesPublicos: `@Test void deveFormatarNomeComPreposicoes() {
    assertEquals("Joao da Silva e Souza", Solution.formatarNome("  JOAO   DA  SILVA  E SOUZA "));
}

@Test void deveManterPrimeiroNomeCapitalizadoMesmoSeForPreposicao() {
    assertEquals("Do Carmo Pereira", Solution.formatarNome("do carmo pereira"));
}
`,
    suiteTestesOcultos: `@Test void deveRetornarVazioParaNuloOuEspacos() {
    assertEquals("", Solution.formatarNome(null));
    assertEquals("", Solution.formatarNome("     "));
}

@Test void deveFormatarNomeSimples() {
    assertEquals("Maria Santos", Solution.formatarNome("maria santos"));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  },
  {
    titulo: "Validador de Sintaxe de Delimitadores Balanceados (Pilha)",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Compiladores, linters e analisadores sintáticos validam se símbolos de abertura e fechamento de blocos estão devidamente emparelhados e aninhados sem cruzamentos ilegais.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static boolean validarDelimitadores(String expressao)
\`\`\`

### Regras de Negócio:
1. Os delimitadores avaliados são parênteses \`()\`, colchetes \`[]\` e chaves \`{}\`.
2. Quaisquer outros caracteres na expressão (letras, números, espaços, operadores) devem ser ignorados.
3. Cada símbolo de abertura deve ser fechado pelo símbolo correspondente na ordem LIFO (Last In, First Out).
4. Fechamentos prematuros ou cruzamentos (ex: \`"([)]"\`) tornam a expressão inválida.
5. Se a expressão for \`null\`, retorne \`false\`. Se for vazia ou não possuir delimitadores, retorne \`true\`.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static boolean validarDelimitadores(String expressao) {
        if (expressao == null) return false;
        Deque<Character> pilha = new ArrayDeque<>();
        for (char c : expressao.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') {
                pilha.push(c);
            } else if (c == ')' || c == ']' || c == '}') {
                if (pilha.isEmpty()) return false;
                char topo = pilha.pop();
                if (c == ')' && topo != '(') return false;
                if (c == ']' && topo != '[') return false;
                if (c == '}' && topo != '{') return false;
            }
        }
        return pilha.isEmpty();
    }
}
`,
    suiteTestesPublicos: `@Test void deveAprovarExpressaoBalanceada() {
    assertTrue(Solution.validarDelimitadores("a + (b * [c - {d / 2}])"));
}

@Test void deveRejeitarCruzamentoInvalido() {
    assertFalse(Solution.validarDelimitadores("([)]"));
}
`,
    suiteTestesOcultos: `@Test void deveRejeitarFechamentoSemAbertura() {
    assertFalse(Solution.validarDelimitadores("())"));
    assertFalse(Solution.validarDelimitadores("]"));
}

@Test void deveAprovarSemDelimitadores() {
    assertTrue(Solution.validarDelimitadores(""));
    assertTrue(Solution.validarDelimitadores("sem simbolos"));
}

@Test void deveRejeitarNulo() {
    assertFalse(Solution.validarDelimitadores(null));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  },
  {
    titulo: "Calculadora de Prazos Processuais em Dias Úteis",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Na contagem de prazos recursais administrativos e judiciais, a contagem de dias úteis exclui sábados e domingos.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String adicionarDiasUteis(String dataIso, int diasUteis)
\`\`\`

### Regras de Negócio:
1. O parâmetro \`dataIso\` é uma data inicial no formato ISO-8601 \`"AAAA-MM-DD"\` (ex: \`"2026-11-09"\`).
2. O parâmetro \`diasUteis\` é um inteiro maior ou igual a zero.
3. Se \`diasUteis == 0\`, retorne a própria data inicial \`dataIso\`.
4. A contagem avança dia a dia; se a data avançada cair em um Sábado ou Domingo, esse dia não conta como dia útil.
5. O retorno deve ser uma String formatada estritamente no padrão \`"AAAA-MM-DD"\`.
6. Se \`dataIso\` for \`null\` ou vazia, retorne \`""\`.`,
    codigoTemplate: `import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.format.DateTimeFormatter;

public class Solution {
    public static String adicionarDiasUteis(String dataIso, int diasUteis) {
        if (dataIso == null || dataIso.trim().isEmpty()) return "";
        if (diasUteis <= 0) return dataIso.trim();

        LocalDate data = LocalDate.parse(dataIso.trim());
        int adicionados = 0;

        while (adicionados < diasUteis) {
            data = data.plusDays(1);
            DayOfWeek dia = data.getDayOfWeek();
            if (dia != DayOfWeek.SATURDAY && dia != DayOfWeek.SUNDAY) {
                adicionados++;
            }
        }

        return data.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }
}
`,
    suiteTestesPublicos: `@Test void deveAdicionarDiasUteisNaMesmaSemana() {
    // 2026-11-09 é Segunda + 3 dias úteis = 2026-11-12 (Quinta)
    assertEquals("2026-11-12", Solution.adicionarDiasUteis("2026-11-09", 3));
}

@Test void devePularFinalDeSemana() {
    // 2026-11-13 é Sexta + 1 dia útil = 2026-11-16 (Segunda)
    assertEquals("2026-11-16", Solution.adicionarDiasUteis("2026-11-13", 1));
}
`,
    suiteTestesOcultos: `@Test void devePularMultiplasSemanas() {
    assertEquals("2026-11-23", Solution.adicionarDiasUteis("2026-11-09", 10));
}

@Test void deveRetornarMesmaDataSeDiasUteisForZero() {
    assertEquals("2026-11-11", Solution.adicionarDiasUteis("2026-11-11", 0));
}

@Test void deveRetornarVazioParaDataNulaOuVazia() {
    assertEquals("", Solution.adicionarDiasUteis(null, 5));
    assertEquals("", Solution.adicionarDiasUteis("  ", 5));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  }
];

// 2. Desafios Pleno (5 desafios)
const desafiosPleno = [
  {
    titulo: "Fusão de Intervalos de Prazos Fiscais Sobrepostos",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Em auditorias fiscais e contratuais, múltiplos períodos de vigência, prorrogações ou suspensões de prazos são submetidos em ordem aleatória. Intervalos adjacentes ou sobrepostos devem ser unificados em um único período contínuo.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<int[]> mesclarIntervalos(List<int[]> intervalos)
\`\`\`

### Regras de Negócio:
1. Cada intervalo é um vetor \`[inicio, fim]\`, com \`inicio <= fim\`.
2. A lista de entrada pode conter intervalos em qualquer ordem.
3. Se dois intervalos se tocam ou se sobrepõem (\`intervaloA[1] >= intervaloB[0]\` após ordenação), devem ser fundidos em \`[min(inicio), max(fim)]\`.
4. Os intervalos finais devem ser retornados em ordem estritamente crescente de \`inicio\`.
5. Se a lista de entrada for \`null\` ou vazia, retorne uma lista vazia.`,
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
    memoryLimitMb: 256
  },
  {
    titulo: "Simulador de Rate Limiting com Algoritmo Token Bucket",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O controle de tráfego de APIs em alta demanda utiliza o algoritmo **Token Bucket** para permitir rajadas moderadas de requisições, ao mesmo tempo em que impõe uma taxa média de recarga contínua.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<Boolean> simularTokenBucket(int capacidade, int taxaPorSegundo, int[] timestampsSegundos)
\`\`\`

### Regras do Algoritmo:
1. O balde inicia com \`capacidade\` tokens no instante da primeira requisição.
2. A cada segundo decorrido entre requisições, adicionam-se \`taxaPorSegundo\` tokens por segundo transcorrido, sem exceder a \`capacidade\` máxima.
3. Ao processar uma requisição no segundo \`t\`:
   - Atualiza-se o saldo com base no tempo decorrido.
   - Se houver pelo menos 1 token disponível, a requisição é autorizada (\`true\`), o saldo decrementa em 1, e o último instante atualiza para \`t\`.
   - Se o saldo for 0, a requisição é negada (\`false\`), o saldo não muda e o último instante atualiza para \`t\`.
4. \`timestampsSegundos\` é um vetor ordenado não-decrescente. Requisições no mesmo segundo compartilham o saldo acumulado.
5. Se o vetor for nulo ou vazio, retorne uma lista vazia.`,
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
    int[] ts = new int[]{0, 0, 0, 0};
    List<Boolean> res = Solution.simularTokenBucket(3, 1, ts);
    assertEquals(4, res.size());
    assertTrue(res.get(0));
    assertTrue(res.get(1));
    assertTrue(res.get(2));
    assertFalse(res.get(3));
}

@Test void deveRecarregarTokensComPassarDoTempo() {
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
    assertFalse(res.get(3));
}

@Test void deveRetornarListaVaziaParaEntradaNulaOuVazia() {
    assertTrue(Solution.simularTokenBucket(5, 1, null).isEmpty());
    assertTrue(Solution.simularTokenBucket(5, 1, new int[0]).isEmpty());
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  },
  {
    titulo: "Implementação de Cache com Política de Descarte LRU",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Caches em memória evitam acessos repetidos a bancos de dados. Quando a capacidade limite é atingida, a política **LRU (Least Recently Used)** remove o elemento que não foi consultado ou alterado há mais tempo.

## Especificação da Tarefa
Implemente a classe \`Solution\`:
\`\`\`java
public class Solution {
    public Solution(int capacidade) { ... }
    public int get(int chave) { ... }
    public void put(int chave, int valor) { ... }
}
\`\`\`

### Regras de Negócio:
1. O construtor recebe \`capacidade > 0\`. Se \`capacidade <= 0\`, lance \`IllegalArgumentException\`.
2. \`get(int chave)\`: Retorna o valor associado à chave ou \`-1\` se não existir. A consulta marca a chave como recentemente utilizada.
3. \`put(int chave, int valor)\`: Atualiza o valor se a chave já existir ou insere o par. Ambas as operações marcam a chave como recentemente utilizada.
4. Se o cache estiver cheio ao inserir uma **nova chave**, descarte a chave menos recentemente utilizada antes de adicionar.
5. As operações \`get\` e \`put\` devem ter complexidade esperada $O(1)$.`,
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
    lru.get(1);     // Chave 1 usada; chave 2 passa a ser a mais antiga
    lru.put(3, 30); // Deve evictar a chave 2
    assertEquals(10, lru.get(1));
    assertEquals(-1, lru.get(2));
    assertEquals(30, lru.get(3));
}
`,
    suiteTestesOcultos: `@Test void deveAtualizarValorExistenteSemEvictarIndevidamente() {
    Solution lru = new Solution(2);
    lru.put(1, 10);
    lru.put(2, 20);
    lru.put(1, 15);
    lru.put(3, 30);
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
    memoryLimitMb: 256
  },
  {
    titulo: "Detector de Dependências Circulares em Tarefas (Grafo Direcionado)",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Em esteiras de compilação e orquestradores de jobs, dependências cíclicas entre tarefas impedem o fluxo de execução e geram impasses lógicos (*deadlocks*).

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static boolean possuiDependenciaCircular(int numTarefas, int[][] dependencias)
\`\`\`

### Regras de Negócio:
1. As tarefas são indexadas de \`0\` a \`numTarefas - 1\`.
2. O array \`dependencias\` contém pares \`[a, b]\`, significando que a tarefa \`a\` depende da conclusão prévia da tarefa \`b\` (aresta \`b -> a\`).
3. Retorne \`true\` se houver ao menos um ciclo no grafo direcionado (dependência circular).
4. Retorne \`false\` se for um DAG (Directed Acyclic Graph) válido.
5. Se \`numTarefas <= 1\` ou \`dependencias\` for nulo ou vazio, retorne \`false\`.`,
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
    int[][] deps = new int[][]{ {0, 1}, {1, 2} };
    assertFalse(Solution.possuiDependenciaCircular(3, deps));
}

@Test void deveDetectarCicloSimplesDireto() {
    int[][] deps = new int[][]{ {0, 1}, {1, 0} };
    assertTrue(Solution.possuiDependenciaCircular(2, deps));
}
`,
    suiteTestesOcultos: `@Test void deveDetectarCicloIndireto() {
    int[][] deps = new int[][]{ {0, 1}, {1, 2}, {2, 3}, {3, 0} };
    assertTrue(Solution.possuiDependenciaCircular(4, deps));
}

@Test void deveRetornarFalseParaSemDependencias() {
    assertFalse(Solution.possuiDependenciaCircular(5, new int[0][]));
    assertFalse(Solution.possuiDependenciaCircular(5, null));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  },
  {
    titulo: "Auditoria de Limites da Lei de Responsabilidade Fiscal (LRF)",
    categoria: "pleno",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O controle de gastos com pessoal do Poder Executivo segue as balizas da Lei Complementar nº 101/2000 (LRF), que estabelece limites proporcionais à Receita Corrente Líquida (RCL).

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String enquadrarGastoPessoal(double rcl, double gastoPessoal)
\`\`\`

### Parâmetros e Regras da LRF:
- **Limite Máximo Legal:** **54,00%** da RCL
- **Limite Prudencial:** **95% do Máximo** = **51,30%** da RCL
- **Limite de Alerta:** **90% do Máximo** = **48,60%** da RCL

### Retornos:
1. Se \`rcl <= 0.0\` ou \`gastoPessoal < 0.0\`, retorne \`"PARAMETROS_INVALIDOS"\`.
2. Se o percentual \`p = (gastoPessoal / rcl) * 100\`:
   - \`p < 48.60\`: retorne \`"REGULAR"\`
   - \`48.60 <= p < 51.30\`: retorne \`"ALERTA"\`
   - \`51.30 <= p <= 54.00\`: retorne \`"PRUDENCIAL"\`
   - \`p > 54.00\`: retorne \`"EXCEDIDO"\`
3. Utilize precisão com tolerância \`1e-6\`.`,
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
    assertEquals("REGULAR", Solution.enquadrarGastoPessoal(1000000.0, 400000.0));
}

@Test void deveIdentificarLimiteExcedido() {
    assertEquals("EXCEDIDO", Solution.enquadrarGastoPessoal(1000000.0, 550000.0));
}
`,
    suiteTestesOcultos: `@Test void deveIdentificarAlertaEPrudencial() {
    assertEquals("ALERTA", Solution.enquadrarGastoPessoal(1000000.0, 490000.0));
    assertEquals("PRUDENCIAL", Solution.enquadrarGastoPessoal(1000000.0, 520000.0));
}

@Test void deveValidarParametrosInvalidos() {
    assertEquals("PARAMETROS_INVALIDOS", Solution.enquadrarGastoPessoal(0.0, 100.0));
    assertEquals("PARAMETROS_INVALIDOS", Solution.enquadrarGastoPessoal(1000.0, -1.0));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  }
];

// 3. Desafios Senior (5 desafios)
const desafiosSenior = [
  {
    titulo: "Implementação de Consistent Hashing com Nós Virtuais",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto Arquitetural
Em arquiteturas de microsserviços distribuídos e bancos de dados particionados (Cassandra, DynamoDB), o **Consistent Hashing** distribui chaves minimizando a realocação de dados ao adicionar ou remover servidores. Cada nó físico é representado por múltiplos **nós virtuais** no anel de 32 bits para equilibrar a carga.

## Especificação da Tarefa
Implemente a classe \`Solution\`:
\`\`\`java
public class Solution {
    public Solution(int numNosVirtuaisPorServidor) { ... }
    public void adicionarServidor(String servidor) { ... }
    public void removerServidor(String servidor) { ... }
    public String obterServidor(String chave) { ... }
}
\`\`\`

### Regras de Negócio:
1. O construtor recebe \`numNosVirtuaisPorServidor >= 1\`. Se menor que 1, lance \`IllegalArgumentException\`.
2. Para cada servidor com nome \`servidor\`, crie \`numNosVirtuaisPorServidor\` nós virtuais usando a chave \`servidor + "#" + i\` (\`i\` de 0 a $N-1$).
3. O hash é calculado via SHA-256 extraindo os 4 primeiros bytes como inteiro com sinal (\`ByteBuffer.wrap(sha256).getInt()\`).
4. Ao consultar \`obterServidor(String chave)\`:
   - Se o anel estiver vazio, retorne \`null\`.
   - Busque o nó virtual com hash $\ge$ hash da chave (sentido horário).
   - Se não houver, dê a volta no anel selecionando o nó de menor hash (\`firstEntry()\`).
   - Retorne o nome do servidor físico associado ao nó virtual.
5. Ao remover um servidor, remova todos os seus nós virtuais do anel.`,
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
    assertEquals(dest1, dest2);
    assertTrue(dest1.equals("nodeA") || dest1.equals("nodeB"));
}

@Test void deveRemoverServidorERedirecionar() {
    Solution ring = new Solution(5);
    ring.adicionarServidor("nodeA");
    ring.adicionarServidor("nodeB");

    ring.removerServidor("nodeA");
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
    memoryLimitMb: 256
  },
  {
    titulo: "Máquina de Estados de Circuit Breaker para Microsserviços",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto Arquitetural
O padrão **Circuit Breaker** previne falhas em cascata isolando serviços com alta taxa de erro e fornecendo mecanismos de recuperação automática controlada.

## Especificação da Tarefa
Implemente a classe \`Solution\`:
\`\`\`java
public class Solution {
    public Solution(int tamanhoJanela, double limiarFalhaPercentual, long timeoutAberturaMs) { ... }
    public boolean permitirRequisicao(long timestampMs) { ... }
    public void registrarSucesso(long timestampMs) { ... }
    public void registrarFalha(long timestampMs) { ... }
    public String obterEstadoAtual(long timestampMs) { ... }
}
\`\`\`

### Estados e Transições:
1. **CLOSED:** Requisições são permitidas. Mantém uma janela deslizante das últimas \`tamanhoJanela\` chamadas. Se a janela estiver cheia e a taxa de falhas for $\ge$ \`limiarFalhaPercentual\`, o circuito transita imediatamente para **OPEN** no instante da falha.
2. **OPEN:** Todas as requisições são rejeitadas (\`permitirRequisicao\` retorna \`false\`). Permanece aberto durante \`timeoutAberturaMs\`. Quando chegar chamada com \`timestampMs >= timestampAbertura + timeoutAberturaMs\`, transita para **HALF_OPEN**.
3. **HALF_OPEN:** Permite exatamente 1 chamada de teste. Se for sucesso (\`registrarSucesso\`), o circuito volta para **CLOSED** e limpa a janela. Se for falha (\`registrarFalha\`), volta imediatamente para **OPEN**, renovando o timeout.
4. \`obterEstadoAtual\` retorna \`"CLOSED"\`, \`"OPEN"\` ou \`"HALF_OPEN"\`.`,
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
    Solution cb = new Solution(4, 50.0, 1000);
    cb.registrarSucesso(100);
    cb.registrarSucesso(200);
    cb.registrarFalha(300);
    cb.registrarFalha(400);

    assertEquals("OPEN", cb.obterEstadoAtual(400));
    assertFalse(cb.permitirRequisicao(500));
}

@Test void deveTransitarParaHalfOpenAposTimeoutERecuperar() {
    Solution cb = new Solution(2, 50.0, 1000);
    cb.registrarFalha(100);
    cb.registrarFalha(200);
    assertEquals("OPEN", cb.obterEstadoAtual(500));

    assertEquals("HALF_OPEN", cb.obterEstadoAtual(1200));
    assertTrue(cb.permitirRequisicao(1200));

    cb.registrarSucesso(1250);
    assertEquals("CLOSED", cb.obterEstadoAtual(1250));
}
`,
    suiteTestesOcultos: `@Test void deveReabrirAoFalharTesteEmHalfOpen() {
    Solution cb = new Solution(2, 50.0, 500);
    cb.registrarFalha(100);
    cb.registrarFalha(200);

    assertEquals("HALF_OPEN", cb.obterEstadoAtual(701));
    assertTrue(cb.permitirRequisicao(701));

    cb.registrarFalha(705);
    assertEquals("OPEN", cb.obterEstadoAtual(705));
    assertFalse(cb.permitirRequisicao(800));
}

@Test void deveManterClosedAbaixoDoLimiar() {
    Solution cb = new Solution(4, 50.0, 1000);
    cb.registrarSucesso(100);
    cb.registrarSucesso(200);
    cb.registrarSucesso(300);
    cb.registrarFalha(400);
    assertEquals("CLOSED", cb.obterEstadoAtual(400));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256
  },
  {
    titulo: "Cálculo do Caminho Crítico de Obras Públicas (CPM em DAGs)",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O **Método do Caminho Crítico (CPM)** analisa cronogramas de atividades em redes de precedência para calcular o tempo total mínimo do projeto e determinar quais atividades têm folga zero (atividades críticas cujo atraso afeta a data de entrega final).

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<String> calcularCaminhoCritico(List<String> tarefasDef, List<String> precedencias)
\`\`\`

### Formato de Entrada:
- \`tarefasDef\`: Lista no padrão \`"ID_TAREFA:DURACAO_DIAS"\` (ex: \`["A:3", "B:4", "C:2"]\`).
- \`precedencias\`: Lista no padrão \`"PREDECESSORA->SUCESSORA"\` (ex: \`["A->B", "B->C"]\`).
- O grafo de entrada é um Grafo Direcionado Acíclico (DAG).

### Regras do CPM:
1. **Early Start (ES) e Early Finish (EF):**
   - Tarefas iniciais: \`ES = 0\`, \`EF = ES + DURACAO\`.
   - Demais tarefas: \`ES = max(EF das predecessoras)\`.
2. Duração Total = maior \`EF\` entre as atividades finais.
3. **Late Start (LS) e Late Finish (LF):**
   - Tarefas finais: \`LF = Duração Total\`.
   - Demais: \`LF = min(LS das sucessoras)\`, \`LS = LF - DURACAO\`.
4. Uma tarefa é crítica se \`Folga = LS - ES == 0\`.
5. Retorne a lista com os IDs das tarefas críticas em ordem topológica de execução.`,
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

        // Ordenação Topológica
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

        // Forward Pass
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

        // Backward Pass
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
    memoryLimitMb: 256
  },
  {
    titulo: "Árvore de Segmentos para Consultas em Tempo Real de Despesas (Segment Tree)",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto Arquitetural
Em painéis analíticos com atualizações pontuais frequentes e consultas constantes de agregação sobre intervalos contíguos de dados, a **Segment Tree** permite consultas de soma e máximo em tempo $O(\\log N)$ com atualizações em $O(\\log N)$.

## Especificação da Tarefa
Implemente a classe \`Solution\`:
\`\`\`java
public class Solution {
    public Solution(long[] valoresIniciais) { ... }
    public void atualizar(int indice, long novoValor) { ... }
    public long consultarSoma(int l, int r) { ... }
    public long consultarMaximo(int l, int r) { ... }
}
\`\`\`

### Regras de Negócio:
1. O construtor recebe o vetor inicial indexado de 0 a $N-1$. Se for nulo ou vazio, lance \`IllegalArgumentException\`.
2. \`atualizar(int indice, long novoValor)\`: Atualiza a posição pontual propagando as somas e máximos na árvore em $O(\\log N)$.
3. \`consultarSoma(int l, int r)\`: Retorna a soma no intervalo fechado \`[l, r]\` ($0 \\le l \\le r < N$) em $O(\\log N)$.
4. \`consultarMaximo(int l, int r)\`: Retorna o maior valor individual no intervalo fechado \`[l, r]\` em $O(\\log N)$.`,
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

    assertEquals(60L, seg.consultarSoma(0, 2));
    assertEquals(50L, seg.consultarMaximo(0, 4));
    assertEquals(30L, seg.consultarMaximo(0, 2));
}

@Test void deveAtualizarValorEPrefletirNaConsulta() {
    long[] valores = new long[]{5, 10, 15};
    Solution seg = new Solution(valores);

    seg.atualizar(1, 50);
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
    memoryLimitMb: 256
  },
  {
    titulo: "Gerenciador de Idempotência Distribuída com Janela TTL",
    categoria: "senior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto Arquitetural
Para prevenir duplicidades causadas por retentativas de rede em mensageria e APIs de pagamento, sistemas distribuídos utilizam chaves de idempotência acompanhadas do hash do payload e expiração temporal (TTL).

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static List<String> processarTransacoesIdempotentes(List<String> requisicoes, long ttlSegundos)
\`\`\`

### Formato das Requisições:
Padrão: \`"TIMESTAMP_SEC:CHAVE_IDEMPOTENCIA:PAYLOAD_HASH:VALOR"\`

### Regras de Negócio:
1. Para cada requisição:
   - Se for a primeira ocorrência da chave ou se a anterior expirou (\`tsAtual - tsAnterior > ttlSegundos\`): armazene no cache e retorne \`"PROCESSADO_OK:VALOR"\`.
   - Se a chave já existir dentro da janela TTL:
     - Se o \`PAYLOAD_HASH\` for idêntico ao armazenado: retorne o resultado em cache com \`"REPLAY_CACHE:VALOR"\`.
     - Se o \`PAYLOAD_HASH\` for diferente: retorne \`"CONFLITO_IDEMPOTENCIA:409"\`.
2. Retorne a lista de status na ordem de chegada das requisições.
3. Se a lista for nula ou vazia, retorne uma lista vazia.`,
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
                cache.put(chave, new Registro(ts, hash, valor));
                resultados.add("PROCESSADO_OK:" + valor);
            } else {
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
        "105:key1:hashA:500"
    );
    List<String> res = Solution.processarTransacoesIdempotentes(reqs, 10);
    assertEquals("PROCESSADO_OK:500", res.get(0));
    assertEquals("REPLAY_CACHE:500", res.get(1));
}

@Test void deveDetectarConflitoComPayloadDiferente() {
    List<String> reqs = Arrays.asList(
        "100:key1:hashA:500",
        "105:key1:hashB:900"
    );
    List<String> res = Solution.processarTransacoesIdempotentes(reqs, 10);
    assertEquals("PROCESSADO_OK:500", res.get(0));
    assertEquals("CONFLITO_IDEMPOTENCIA:409", res.get(1));
}
`,
    suiteTestesOcultos: `@Test void deveExpirarAposTTL() {
    List<String> reqs = Arrays.asList(
        "100:key1:hashA:500",
        "200:key1:hashA:500"
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
    memoryLimitMb: 256
  }
];

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5433/devtest_db"
  });

  const client = await pool.connect();
  try {
    console.log("Conectado ao PostgreSQL local com sucesso!");

    // Buscar o primeiro processo seletivo e trilha disponíveis
    const psRes = await client.query("SELECT id FROM processos_seletivos LIMIT 1;");
    const trilhaRes = await client.query("SELECT id FROM trilhas LIMIT 1;");

    const psId = psRes.rows[0]?.id || null;
    const trilhaId = trilhaRes.rows[0]?.id || null;

    console.log(`Processo Seletivo ID: ${psId}`);
    console.log(`Trilha ID: ${trilhaId}`);

    const todos = [
      ...desafiosJunior,
      ...desafiosPleno,
      ...desafiosSenior
    ];

    console.log(`\nInserindo ${todos.length} desafios (5 Junior, 5 Pleno, 5 Senior)...`);

    for (const d of todos) {
      const id = `desafio-local-${crypto.randomUUID()}`;
      await client.query(`
        INSERT INTO desafios (
          id, titulo, categoria,
          enunciado_markdown, linguagem, codigo_template,
          suite_testes_publicos, suite_testes_ocultos,
          timeout_seconds, memory_limit_mb, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `, [
        id,
        d.titulo,
        d.categoria,
        d.enunciadoMarkdown,
        d.linguagem,
        templatesPorTitulo[d.titulo] || d.codigoTemplate,
        d.suiteTestesPublicos,
        d.suiteTestesOcultos,
        d.timeoutSeconds,
        d.memoryLimitMb
      ]);
      console.log(`✓ [${d.categoria.toUpperCase()}] ${d.titulo} inserido no Banco Global com ID: ${id}`);

      // Vincula na tabela associativa N:N processo_seletivo_desafios se houver processo
      if (psId) {
        await client.query(`
          INSERT INTO processo_seletivo_desafios (id, processo_seletivo_id, desafio_id, ordem, created_at)
          VALUES ($1, $2, $3, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM processo_seletivo_desafios WHERE processo_seletivo_id = $2), NOW())
          ON CONFLICT (processo_seletivo_id, desafio_id) DO NOTHING
        `, [`psd-${crypto.randomUUID()}`, psId, id]);
      }
    }

    // Conferência final no banco
    const countRes = await client.query(`
      SELECT categoria, count(*) as total 
      FROM desafios 
      GROUP BY categoria 
      ORDER BY categoria;
    `);

    console.log("\n--- Contagem no banco de dados local ---");
    console.table(countRes.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
