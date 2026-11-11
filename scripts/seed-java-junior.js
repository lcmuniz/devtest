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

const desafios = [
  {
    titulo: "Validador de CPF com Verificação de Dígitos",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Nos sistemas de cadastro de processos seletivos públicos e auditoria do Estado, é indispensável verificar se os números de CPF informados são matematicamente consistentes de acordo com a regra oficial da Receita Federal (Módulo 11).

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static boolean validarCPF(String cpf)
\`\`\`

### Regras de Negócio:
1. **Sanitização:** O parâmetro \`cpf\` pode conter pontos e traço (ex: \`"529.982.247-25"\`) ou apenas números (\`"52998224725"\`). Todos os caracteres que não forem dígitos numéricos devem ser ignorados.
2. **Nulo ou Vazio:** Se a entrada for \`null\` ou tiver menos de 11 dígitos numéricos, deve retornar imediatamente \`false\`.
3. **Dígitos Repetidos:** Sequências com 11 dígitos idênticos (ex: \`"00000000000"\`, \`"11111111111"\`, etc.) são comprovadamente inválidas e devem retornar \`false\`.
4. **Cálculo do 1º Dígito Verificador:**
   - Multiplique os 9 primeiros dígitos pelos pesos decrescentes de 10 até 2.
   - Some os resultados parciais.
   - O resto é dado por: \`resto = (soma * 10) % 11\`. Se o \`resto\` for 10 ou 11, o primeiro dígito esperado é \`0\`.
   - Se o 1º dígito calculado for diferente do 10º dígito do CPF, retorne \`false\`.
5. **Cálculo do 2º Dígito Verificador:**
   - Multiplique os 10 primeiros dígitos pelos pesos decrescentes de 11 até 2.
   - Some os resultados parciais.
   - O resto é dado por: \`resto = (soma * 10) % 11\`. Se o \`resto\` for 10 ou 11, o segundo dígito esperado é \`0\`.
   - Se o 2º dígito calculado for diferente do 11º dígito do CPF, retorne \`false\`.
6. Retorne \`true\` se ambos os dígitos forem estritamente válidos.`,
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

@Test void deveRejeitarCpfComDigitoVerificadorErrado() {
    assertFalse(Solution.validarCPF("52998224726"));
}

@Test void deveRejeitarCpfNuloOuVazio() {
    assertFalse(Solution.validarCPF(null));
    assertFalse(Solution.validarCPF(""));
    assertFalse(Solution.validarCPF("123"));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Cálculo de Desconto Progressivo Previdenciário (INSS)",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O cálculo de folha de pagamento de servidores e colaboradores adota o modelo de alíquotas progressivas, onde cada fatia do salário bruto é tributada em sua respectiva faixa de contribuição.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static double calcularINSS(double salarioBruto)
\`\`\`

### Tabela de Faixas Progressivas:
- **Faixa 1:** Até R$ 1.412,00 -> Alíquota de **7,5%**
- **Faixa 2:** De R$ 1.412,01 até R$ 2.666,68 -> Alíquota de **9,0%** (sobre a diferença desta faixa)
- **Faixa 3:** De R$ 2.666,69 até R$ 4.000,03 -> Alíquota de **12,0%** (sobre a diferença desta faixa)
- **Faixa 4:** De R$ 4.000,04 até o Teto de R$ 7.786,02 -> Alíquota de **14,0%** (sobre a parcela)
- **Acima do Teto:** Para qualquer salário superior a R$ 7.786,02, o desconto não ultrapassa o valor total da contribuição do teto.

### Regras de Negócio:
1. Se \`salarioBruto <= 0.0\`, deve retornar \`0.0\`.
2. O resultado retornado deve ser arredondado para duas casas decimais com \`Math.round(valor * 100.0) / 100.0\`.`,
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
    assertEquals(Double.valueOf(0.0), Double.valueOf(Solution.calcularINSS(-500.0)));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Formatador e Padronizador de Nomes Próprios",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Cadastros oriundos de inscrições frequentemente apresentam grafias despadronizadas, letras todas em maiúsculas ou minúsculas, além de múltiplos espaços desnecessários.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String formatarNome(String nomeCompleto)
\`\`\`

### Regras de Negócio:
1. Eliminar espaços extras no início, no fim e condensar múltiplos espaços internos consecutivos em um único espaço.
2. Cada palavra deve iniciar com letra maiúscula e ter o restante em minúsculo (ex: \`"CARLOS ALBERTO"\` -> \`"Carlos Alberto"\`).
3. As seguintes preposições e conjunções gramaticais da língua portuguesa devem ser mantidas **estritamente em minúsculas**, a menos que sejam a primeira palavra do nome:
   - \`"de"\`, \`"da"\`, \`"do"\`, \`"das"\`, \`"dos"\`, \`"e"\`.
4. Se o parâmetro \`nomeCompleto\` for \`null\` ou contiver apenas espaços, retorne uma string vazia \`""\`.`,
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
    memoryLimitMb: 256,
  },
  {
    titulo: "Detector de Anagramas Textuais",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Na análise forense e detecção de duplicidades em processos, é útil verificar se duas palavras ou frases possuem a mesma composição de letras, mesmo quando rearranjadas.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static boolean saoAnagramas(String s1, String s2)
\`\`\`

### Regras de Negócio:
1. Dois textos são considerados anagramas se contiverem exatamente as mesmas letras com as mesmas contagens.
2. A verificação deve ser insensível a maiúsculas/minúsculas (\`case-insensitive\`).
3. Devem ser desconsiderados espaços em branco e sinais de pontuação comuns (\`.\`, \`,\`, \`-\`, \`!\`, \`?\`). Apenas as letras do alfabeto (a-z) devem ser contabilizadas.
4. Se qualquer uma das strings for \`null\`, retorne \`false\`.
5. Duas strings que não contenham nenhuma letra válida (ex: vazias ou compostas apenas de espaços) são consideradas anagramas (\`true\`).`,
    codigoTemplate: `import java.util.Arrays;

public class Solution {
    public static boolean saoAnagramas(String s1, String s2) {
        if (s1 == null || s2 == null) return false;
        String l1 = s1.toLowerCase().replaceAll("[^a-z]", "");
        String l2 = s2.toLowerCase().replaceAll("[^a-z]", "");
        if (l1.length() != l2.length()) return false;
        char[] a1 = l1.toCharArray();
        char[] a2 = l2.toCharArray();
        Arrays.sort(a1);
        Arrays.sort(a2);
        return Arrays.equals(a1, a2);
    }
}
`,
    suiteTestesPublicos: `@Test void deveIdentificarAnagramaSimples() {
    assertTrue(Solution.saoAnagramas("Amor", "Roma"));
}

@Test void deveRejeitarNaoAnagramas() {
    assertFalse(Solution.saoAnagramas("casa", "carro"));
}
`,
    suiteTestesOcultos: `@Test void deveIgnorarPontuacaoEEspacos() {
    assertTrue(Solution.saoAnagramas("A decimal point", "I'm a dot in place"));
}

@Test void deveRetornarFalseSeAlgumForNulo() {
    assertFalse(Solution.saoAnagramas(null, "teste"));
    assertFalse(Solution.saoAnagramas("teste", null));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Localizador do Primeiro Caractere Não Repetido",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
No processamento de logs e streams de eventos de transações, é comum rastrear a primeira ocorrência única em uma sequência temporal de caracteres.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static Character primeiroNaoRepetido(String texto)
\`\`\`

### Regras de Negócio:
1. Retorne o primeiro caractere da esquerda para a direita que possui frequência de ocorrência igual a 1 no texto.
2. A contagem é sensível a maiúsculas e minúsculas (\`'A'\` != \`'a'\`).
3. Se o texto for \`null\`, vazio (\`""\`) ou se todos os caracteres presentes repetirem-se mais de uma vez, retorne \`null\`.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    public static Character primeiroNaoRepetido(String texto) {
        if (texto == null || texto.isEmpty()) return null;
        Map<Character, Integer> freq = new LinkedHashMap<>();
        for (char c : texto.toCharArray()) {
            freq.put(c, freq.getOrDefault(c, 0) + 1);
        }
        for (Map.Entry<Character, Integer> entry : freq.entrySet()) {
            if (entry.getValue() == 1) {
                return entry.getKey();
            }
        }
        return null;
    }
}
`,
    suiteTestesPublicos: `@Test void deveEncontrarPrimeiroUnicoEmPalavra() {
    assertEquals(Character.valueOf('c'), Solution.primeiroNaoRepetido("abracadabra"));
}

@Test void deveEncontrarEmPalavraCurta() {
    assertEquals(Character.valueOf('w'), Solution.primeiroNaoRepetido("swiss"));
}
`,
    suiteTestesOcultos: `@Test void deveRetornarNullQuandoTodosRepetem() {
    assertEquals(null, Solution.primeiroNaoRepetido("aabbcc"));
}

@Test void deveRetornarNullParaNuloOuVazio() {
    assertEquals(null, Solution.primeiroNaoRepetido(null));
    assertEquals(null, Solution.primeiroNaoRepetido(""));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Validador de Sintaxe de Delimitadores Balanceados",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Em ferramentas de análise estática de código e validadores de expressões matemáticas em planilhas, é fundamental validar se símbolos de agrupamento estão corretamente aninhados e fechados.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static boolean validarDelimitadores(String expressao)
\`\`\`

### Regras de Negócio:
1. Os delimitadores avaliados são parênteses \`()\`, colchetes \`[]\` e chaves \`{}\`.
2. Qualquer outro caractere presente na string (espaços, letras, números, operadores aritméticos) deve ser simplesmente ignorado.
3. Para cada símbolo que abre, deve haver o correspondente que fecha na ordem de precedência da pilha LIFO (Last-In, First-Out).
4. Delimitadores que fecham sem ter sido abertos ou delimitadores cruzados (ex: \`"([)]"\`) tornam a expressão inválida.
5. Se a expressão for \`null\`, retorne \`false\`. Se for vazia ou não tiver nenhum delimitador, retorne \`true\`.`,
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
    memoryLimitMb: 256,
  },
  {
    titulo: "Calculadora de Estatísticas Descritivas de Amostra",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Na consolidação de notas de provas objetivas e aferição de tempos de processamento, a equipe de desenvolvimento precisa gerar indicadores estatísticos básicos sobre vetores numéricos.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static double[] calcularEstatisticas(int[] numeros)
\`\`\`

### Regras de Negócio:
1. O método deve retornar um array de \`double\` com exatamente 3 elementos na ordem:
   - \`[0]\`: Média aritmética simples dos números (\`soma / quantidade\`).
   - \`[1]\`: Menor valor encontrado no array (mínimo).
   - \`[2]\`: Maior valor encontrado no array (máximo).
2. Se o array \`numeros\` for \`null\` ou tiver tamanho zero (\`length == 0\`), o método deve obrigatoriamente lançar uma exceção \`IllegalArgumentException\` com mensagem informativa.`,
    codigoTemplate: `public class Solution {
    public static double[] calcularEstatisticas(int[] numeros) {
        if (numeros == null || numeros.length == 0) {
            throw new IllegalArgumentException("O array de numeros nao pode ser nulo ou vazio.");
        }
        long soma = 0;
        int min = numeros[0];
        int max = numeros[0];
        for (int n : numeros) {
            soma += n;
            if (n < min) min = n;
            if (n > max) max = n;
        }
        double media = (double) soma / numeros.length;
        return new double[] { media, (double) min, (double) max };
    }
}
`,
    suiteTestesPublicos: `@Test void deveCalcularParaArrayPositivo() {
    double[] res = Solution.calcularEstatisticas(new int[] { 10, 20, 30 });
    assertEquals(Double.valueOf(20.0), Double.valueOf(res[0]));
    assertEquals(Double.valueOf(10.0), Double.valueOf(res[1]));
    assertEquals(Double.valueOf(30.0), Double.valueOf(res[2]));
}
`,
    suiteTestesOcultos: `@Test void deveCalcularComValoresNegativos() {
    double[] res = Solution.calcularEstatisticas(new int[] { -10, 0, 10 });
    assertEquals(Double.valueOf(0.0), Double.valueOf(res[0]));
    assertEquals(Double.valueOf(-10.0), Double.valueOf(res[1]));
    assertEquals(Double.valueOf(10.0), Double.valueOf(res[2]));
}

@Test void deveLancarExcecaoParaArrayVazioOuNulo() {
    boolean lancou = false;
    try {
        Solution.calcularEstatisticas(new int[0]);
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
    titulo: "Compressão de Sequências Repetidas (RLE)",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
O algoritmo Run-Length Encoding (RLE) é uma técnica clássica de compressão de dados sem perdas, muito aplicada em cabeçalhos de mensagens de telemetria e imagens binárias.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String comprimirRLE(String entrada)
\`\`\`

### Regras de Negócio:
1. Cada sequência de caracteres idênticos consecutivos deve ser representada pelo caractere seguido da quantidade de vezes que ele ocorre em sequência.
2. Exemplos:
   - \`"AAABBBCC"\` -> \`"A3B3C2"\`
   - \`"ABCD"\` -> \`"A1B1C1D1"\`
3. A contagem é estritamente sensível a maiúsculas e minúsculas (\`"aA"\` -> \`"a1A1"\`).
4. Se o parâmetro \`entrada\` for \`null\` ou uma string vazia (\`""\`), deve retornar uma string vazia \`""\`.`,
    codigoTemplate: `public class Solution {
    public static String comprimirRLE(String entrada) {
        if (entrada == null || entrada.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        int n = entrada.length();
        int i = 0;
        while (i < n) {
            char atual = entrada.charAt(i);
            int count = 0;
            while (i < n && entrada.charAt(i) == atual) {
                count++;
                i++;
            }
            sb.append(atual).append(count);
        }
        return sb.toString();
    }
}
`,
    suiteTestesPublicos: `@Test void deveComprimirRepeticoesConsecutivas() {
    assertEquals("A3B3C2", Solution.comprimirRLE("AAABBBCC"));
}

@Test void deveComprimirSemRepeticaoComContadorUm() {
    assertEquals("A1B1C1D1", Solution.comprimirRLE("ABCD"));
}
`,
    suiteTestesOcultos: `@Test void deveDistinguirMaiusculasEMinusculas() {
    assertEquals("A2a2", Solution.comprimirRLE("AAaa"));
}

@Test void deveRetornarVazioParaNuloOuVazio() {
    assertEquals("", Solution.comprimirRLE(null));
    assertEquals("", Solution.comprimirRLE(""));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Conversor de Numerais Romanos para Decimal",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
No ambiente jurídico e governamental, referências a títulos de leis, incisos, varas judiciais e sessões legislativas utilizam numerais romanos que precisam ser convertidos para números inteiros nos sistemas digitais.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static int converterRomano(String romano)
\`\`\`

### Tabela de Valores:
- **I:** 1, **V:** 5, **X:** 10, **L:** 50, **C:** 100, **D:** 500, **M:** 1000

### Regras de Negócio:
1. Caso Aditivo: Letras ordenadas de forma decrescente são somadas (ex: \`"VI"\` = 5 + 1 = 6; \`"XVI"\` = 16).
2. Caso Subtrativo: Quando um valor menor precede um maior, ele é subtraído (ex: \`"IV"\` = 4; \`"IX"\` = 9; \`"XL"\` = 40; \`"XC"\` = 90; \`"CD"\` = 400; \`"CM"\` = 900).
3. Deve suportar caracteres em maiúsculas ou minúsculas (ex: \`"xiv"\` -> 14).
4. Se o parâmetro for \`null\`, vazio ou contiver apenas espaços, retorne \`0\`.`,
    codigoTemplate: `import java.util.*;

public class Solution {
    private static final Map<Character, Integer> VALORES = new HashMap<>();
    static {
        VALORES.put('I', 1);
        VALORES.put('V', 5);
        VALORES.put('X', 10);
        VALORES.put('L', 50);
        VALORES.put('C', 100);
        VALORES.put('D', 500);
        VALORES.put('M', 1000);
    }

    public static int converterRomano(String romano) {
        if (romano == null || romano.trim().isEmpty()) return 0;
        String s = romano.trim().toUpperCase();
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            int atual = VALORES.getOrDefault(s.charAt(i), 0);
            if (i + 1 < s.length()) {
                int proximo = VALORES.getOrDefault(s.charAt(i + 1), 0);
                if (atual < proximo) {
                    total -= atual;
                    continue;
                }
            }
            total += atual;
        }
        return total;
    }
}
`,
    suiteTestesPublicos: `@Test void deveConverterCasosComuns() {
    assertEquals(3, Solution.converterRomano("III"));
    assertEquals(14, Solution.converterRomano("XIV"));
}

@Test void deveConverterAnoHistorico() {
    assertEquals(1994, Solution.converterRomano("MCMXCIV"));
}
`,
    suiteTestesOcultos: `@Test void deveIgnorarCaseSensitivity() {
    assertEquals(40, Solution.converterRomano("xl"));
    assertEquals(90, Solution.converterRomano("xc"));
}

@Test void deveRetornarZeroParaNuloOuVazio() {
    assertEquals(0, Solution.converterRomano(null));
    assertEquals(0, Solution.converterRomano("   "));
}
`,
    timeoutSeconds: 10,
    memoryLimitMb: 256,
  },
  {
    titulo: "Calculadora de Prazos Processuais em Dias Úteis",
    categoria: "junior",
    linguagem: "java",
    enunciadoMarkdown: `## Contexto do Problema
Nos termos do Código de Processo Civil, a contagem de prazos recursais e de manifestação processual é efetuada estritamente em **dias úteis**, excluindo-se sábados e domingos.

## Especificação da Tarefa
Implemente na classe \`Solution\` o método estático:
\`\`\`java
public static String adicionarDiasUteis(String dataIso, int diasUteis)
\`\`\`

### Regras de Negócio:
1. O parâmetro \`dataIso\` é uma data inicial no formato ISO-8601 \`"AAAA-MM-DD"\` (ex: \`"2026-11-09"\`).
2. O parâmetro \`diasUteis\` é um número inteiro maior ou igual a zero.
3. Se \`diasUteis == 0\`, retorne a própria data inicial \`dataIso\`.
4. A contagem avança dia a dia; quando o dia cair em um Sábado ou Domingo, esse dia não é contabilizado no total de dias úteis adicionados.
5. O retorno final deve ser uma String formatada estritamente no padrão \`"AAAA-MM-DD"\`.
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
    // 2026-11-09 é Segunda-feira + 3 dias úteis = 2026-11-12 (Quinta-feira)
    assertEquals("2026-11-12", Solution.adicionarDiasUteis("2026-11-09", 3));
}

@Test void devePularFinalDeSemana() {
    // 2026-11-13 é Sexta-feira + 1 dia útil = 2026-11-16 (Segunda-feira)
    assertEquals("2026-11-16", Solution.adicionarDiasUteis("2026-11-13", 1));
}
`,
    suiteTestesOcultos: `@Test void devePularMultiplasSemanas() {
    // 2026-11-09 (Segunda) + 10 dias úteis = 2026-11-23 (Segunda da 3ª semana)
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


  console.log(`Cadastrando ${desafios.length} desafios nível Júnior em Java...`);

  for (let i = 0; i < desafios.length; i++) {
    const d = desafios[i];
    console.log(`[${i + 1}/${desafios.length}] Criando desafio: ${d.titulo}...`);

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

  console.log("\nTodos os desafios foram processados com sucesso!");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
