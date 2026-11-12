const { Pool } = require("pg");

const templatesPorTitulo = {
  "Validador de CPF com Verificação de Dígitos (Módulo 11)": `public class Solution {
    public static boolean validarCPF(String cpf) {
        // TODO: Implemente a validação do CPF aqui
        return false;
    }
}
`,

  "Cálculo de Desconto Progressivo Previdenciário (INSS)": `public class Solution {
    public static double calcularINSS(double salarioBruto) {
        // TODO: Implemente o cálculo progressivo do INSS aqui
        return 0.0;
    }
}
`,

  "Formatador e Padronizador de Nomes Próprios": `import java.util.*;

public class Solution {
    public static String formatarNome(String nomeCompleto) {
        // TODO: Implemente a formatação e padronização do nome aqui
        return "";
    }
}
`,

  "Validador de Sintaxe de Delimitadores Balanceados (Pilha)": `import java.util.*;

public class Solution {
    public static boolean validarDelimitadores(String expressao) {
        // TODO: Implemente a validação dos delimitadores balanceados aqui
        return false;
    }
}
`,

  "Calculadora de Prazos Processuais em Dias Úteis": `import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.format.DateTimeFormatter;

public class Solution {
    public static String adicionarDiasUteis(String dataIso, int diasUteis) {
        // TODO: Implemente a contagem de dias úteis aqui
        return "";
    }
}
`,

  "Fusão de Intervalos de Prazos Fiscais Sobrepostos": `import java.util.*;

public class Solution {
    public static List<int[]> mesclarIntervalos(List<int[]> intervalos) {
        // TODO: Implemente a fusão de intervalos sobrepostos aqui
        return new ArrayList<>();
    }
}
`,

  "Simulador de Rate Limiting com Algoritmo Token Bucket": `import java.util.*;

public class Solution {
    public static List<Boolean> simularTokenBucket(int capacidade, int taxaPorSegundo, int[] timestampsSegundos) {
        // TODO: Implemente o simulador de Token Bucket aqui
        return new ArrayList<>();
    }
}
`,

  "Implementação de Cache com Política de Descarte LRU": `import java.util.*;

public class Solution {
    public Solution(int capacidade) {
        // TODO: Inicialize sua estrutura de dados aqui
    }

    public int get(int chave) {
        // TODO: Implemente a consulta e atualização LRU aqui
        return -1;
    }

    public void put(int chave, int valor) {
        // TODO: Implemente a inserção/atualização e descarte LRU aqui
    }
}
`,

  "Detector de Dependências Circulares em Tarefas (Grafo Direcionado)": `import java.util.*;

public class Solution {
    public static boolean possuiDependenciaCircular(int numTarefas, int[][] dependencias) {
        // TODO: Implemente a detecção de ciclos no grafo direcionado aqui
        return false;
    }
}
`,

  "Auditoria de Limites da Lei de Responsabilidade Fiscal (LRF)": `public class Solution {
    public static String enquadrarGastoPessoal(double rcl, double gastoPessoal) {
        // TODO: Implemente o enquadramento do gasto com pessoal pela LRF aqui
        return "";
    }
}
`,

  "Implementação de Consistent Hashing com Nós Virtuais": `import java.util.*;

public class Solution {
    public Solution(int numNosVirtuaisPorServidor) {
        // TODO: Inicialize o anel de consistent hashing aqui
    }

    public void adicionarServidor(String servidor) {
        // TODO: Adicione o servidor físico e seus nós virtuais no anel
    }

    public void removerServidor(String servidor) {
        // TODO: Remova o servidor físico e seus nós virtuais do anel
    }

    public String obterServidor(String chave) {
        // TODO: Localize e retorne o servidor responsável pela chave
        return null;
    }
}
`,

  "Máquina de Estados de Circuit Breaker para Microsserviços": `import java.util.*;

public class Solution {
    public Solution(int tamanhoJanela, double limiarFalhaPercentual, long timeoutAberturaMs) {
        // TODO: Inicialize os parâmetros do Circuit Breaker aqui
    }

    public synchronized boolean permitirRequisicao(long timestampMs) {
        // TODO: Verifique se a requisição é permitida no estado atual
        return false;
    }

    public synchronized void registrarSucesso(long timestampMs) {
        // TODO: Registre sucesso e atualize o estado do circuito
    }

    public synchronized void registrarFalha(long timestampMs) {
        // TODO: Registre falha e atualize o estado do circuito
    }

    public synchronized String obterEstadoAtual(long timestampMs) {
        // TODO: Retorne o estado atual ("CLOSED", "OPEN" ou "HALF_OPEN")
        return "CLOSED";
    }
}
`,

  "Cálculo do Caminho Crítico de Obras Públicas (CPM em DAGs)": `import java.util.*;

public class Solution {
    public static List<String> calcularCaminhoCritico(List<String> tarefasDef, List<String> precedencias) {
        // TODO: Implemente o algoritmo do Caminho Crítico (CPM) aqui
        return new ArrayList<>();
    }
}
`,

  "Árvore de Segmentos para Consultas em Tempo Real de Despesas (Segment Tree)": `public class Solution {
    public Solution(long[] valoresIniciais) {
        // TODO: Construa a Segment Tree aqui
    }

    public void atualizar(int indice, long novoValor) {
        // TODO: Atualize o valor na posição pontual e recalcule as agregações
    }

    public long consultarSoma(int l, int r) {
        // TODO: Retorne a soma no intervalo [l, r]
        return 0L;
    }

    public long consultarMaximo(int l, int r) {
        // TODO: Retorne o maior valor no intervalo [l, r]
        return 0L;
    }
}
`,

  "Gerenciador de Idempotência Distribuída com Janela TTL": `import java.util.*;

public class Solution {
    public static List<String> processarTransacoesIdempotentes(List<String> requisicoes, long ttlSegundos) {
        // TODO: Implemente o processamento de transações idempotentes com TTL aqui
        return new ArrayList<>();
    }
}
`
};

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5433/devtest_db"
  });

  const client = await pool.connect();
  try {
    console.log("Atualizando templates de código dos 15 desafios para esqueletos (stubs)...");
    let atualizados = 0;

    for (const [titulo, template] of Object.entries(templatesPorTitulo)) {
      const res = await client.query(
        "UPDATE desafios SET codigo_template = $1, updated_at = NOW() WHERE titulo = $2 RETURNING id, titulo;",
        [template, titulo]
      );
      if (res.rowCount > 0) {
        console.log(`✓ Atualizado: [${res.rows[0].id}] ${res.rows[0].titulo}`);
        atualizados++;
      } else {
        console.warn(`⚠ Desafio não encontrado pelo título: "${titulo}"`);
      }
    }

    console.log(`\nConcluído! ${atualizados} desafios atualizados com sucesso no PostgreSQL.`);
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { templatesPorTitulo };

if (require.main === module) {
  run().catch((err) => {
    console.error("Erro na atualização:", err);
    process.exit(1);
  });
}
