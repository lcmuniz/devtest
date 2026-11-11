import { describe, it, expect } from "vitest";
import {
  validarCpf,
  calcularPontuacaoBarema,
  type ItemBaremaDeclarado,
} from "./candidato-barema";
import {
  TipoCriterioBarema,
  type CriterioBaremaInput,
} from "../processo-seletivo/processo-seletivo";

describe("Candidato & Barema - Validação de Domínio & Precisão Matemática (Seam 1)", () => {
  describe("Validação de CPF", () => {
    it("deve validar CPFs válidos com ou sem formatação", () => {
      expect(validarCpf("52998224725")).toBe(true);
      expect(validarCpf("529.982.247-25")).toBe(true);
      expect(validarCpf("11144477735")).toBe(true);
    });

    it("deve rejeitar CPFs com dígitos verificadores incorretos", () => {
      expect(validarCpf("52998224726")).toBe(false);
      expect(validarCpf("12345678900")).toBe(false);
    });

    it("deve rejeitar sequências inválidas ou tamanhos incorretos", () => {
      expect(validarCpf("11111111111")).toBe(false);
      expect(validarCpf("00000000000")).toBe(false);
      expect(validarCpf("123")).toBe(false);
      expect(validarCpf("")).toBe(false);
    });
  });

  describe("Cálculo Matemático do Barema Curricular", () => {
    const matrizBarema: (CriterioBaremaInput & { id: string })[] = [
      {
        id: "crit-exp",
        tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
        descricao: "Anos de experiência profissional comprovada na área",
        pontuacaoUnitaria: 2.0,
        pontuacaoMaxima: 20.0,
        permiteMultiplos: true,
        exigeComprovante: true,
      },
      {
        id: "crit-esp",
        tipo: TipoCriterioBarema.ESPECIALIZACAO,
        descricao: "Pós-graduação Lato Sensu em Computação ou áreas afins",
        pontuacaoUnitaria: 10.0,
        pontuacaoMaxima: 10.0,
        permiteMultiplos: false,
        exigeComprovante: true,
      },
      {
        id: "crit-mest",
        tipo: TipoCriterioBarema.MESTRADO,
        descricao: "Mestrado Stricto Sensu em Computação",
        pontuacaoUnitaria: 20.0,
        pontuacaoMaxima: 20.0,
        permiteMultiplos: false,
        exigeComprovante: true,
      },
      {
        id: "crit-dout",
        tipo: TipoCriterioBarema.DOUTORADO,
        descricao: "Doutorado Stricto Sensu em Ciência da Computação",
        pontuacaoUnitaria: 30.0,
        pontuacaoMaxima: 30.0,
        permiteMultiplos: false,
        exigeComprovante: true,
      },
      {
        id: "crit-cert",
        tipo: TipoCriterioBarema.CERTIFICACAO,
        descricao: "Certificações técnicas oficiais",
        pontuacaoUnitaria: 5.0,
        pontuacaoMaxima: 20.0,
        permiteMultiplos: true,
        exigeComprovante: true,
      },
    ];

    it("deve calcular corretamente a pontuação provisória sem atingir tetos", () => {
      const itensDeclarados: ItemBaremaDeclarado[] = [
        {
          criterioId: "crit-exp",
          quantidadeOuAnos: 3, // 3 * 2 = 6.0 (teto 20)
          arquivoComprovanteNome: "experiencia.pdf",
        },
        {
          criterioId: "crit-esp",
          quantidadeOuAnos: 1, // 1 * 10 = 10.0 (teto 10)
          arquivoComprovanteNome: "pos_graduacao.pdf",
        },
        {
          criterioId: "crit-cert",
          quantidadeOuAnos: 2, // 2 * 5 = 10.0 (teto 20)
          arquivoComprovanteNome: "aws_cert.pdf",
        },
      ];

      const resultado = calcularPontuacaoBarema(matrizBarema, itensDeclarados);
      expect(resultado.pontuacaoProvisoriaBarema).toBe(26.0); // 6 + 10 + 10 = 26
      expect(resultado.itensDetalhados).toHaveLength(3);

      const itemExp = resultado.itensDetalhados.find((i) => i.criterioId === "crit-exp");
      expect(itemExp?.pontosCalculados).toBe(6.0);
      expect(itemExp?.atingiuTeto).toBe(false);
    });

    it("deve aplicar estritamente o teto máximo individual quando a quantidade declarada exceder o limite", () => {
      const itensDeclarados: ItemBaremaDeclarado[] = [
        {
          criterioId: "crit-exp",
          quantidadeOuAnos: 15, // 15 * 2 = 30.0, porém teto é 20.0
          arquivoComprovanteNome: "carteira_trabalho.pdf",
        },
        {
          criterioId: "crit-cert",
          quantidadeOuAnos: 6, // 6 * 5 = 30.0, porém teto é 20.0
          arquivoComprovanteNome: "certificacoes.pdf",
        },
      ];

      const resultado = calcularPontuacaoBarema(matrizBarema, itensDeclarados);
      expect(resultado.pontuacaoProvisoriaBarema).toBe(40.0); // 20 (teto exp) + 20 (teto cert)

      const itemExp = resultado.itensDetalhados.find((i) => i.criterioId === "crit-exp");
      expect(itemExp?.pontosBrutos).toBe(30.0);
      expect(itemExp?.pontosCalculados).toBe(20.0);
      expect(itemExp?.atingiuTeto).toBe(true);

      const itemCert = resultado.itensDetalhados.find((i) => i.criterioId === "crit-cert");
      expect(itemCert?.pontosBrutos).toBe(30.0);
      expect(itemCert?.pontosCalculados).toBe(20.0);
      expect(itemCert?.atingiuTeto).toBe(true);
    });

    it("deve zerar a pontuação de critério que exige comprovante se o arquivo não for fornecido ou não for PDF", () => {
      const itensDeclarados: ItemBaremaDeclarado[] = [
        {
          criterioId: "crit-mest",
          quantidadeOuAnos: 1, // Exige comprovante
          arquivoComprovanteNome: "", // Ausente
        },
        {
          criterioId: "crit-dout",
          quantidadeOuAnos: 1,
          arquivoComprovanteNome: "diploma.docx", // Não é PDF
        },
      ];

      const resultado = calcularPontuacaoBarema(matrizBarema, itensDeclarados);
      expect(resultado.pontuacaoProvisoriaBarema).toBe(0.0);
      expect(resultado.errosValidacao).toBeDefined();
      expect(resultado.errosValidacao?.length).toBeGreaterThanOrEqual(2);
    });
  });
});
