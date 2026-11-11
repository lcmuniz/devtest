import { describe, it, expect, beforeEach } from "vitest";
import {
  RateLimiterMemoria,
  extrairIpCliente,
  formatarHeadersRateLimit,
} from "./rate-limit";

describe("Domínio de Segurança e Rate Limiting", () => {
  let limiter: RateLimiterMemoria;

  beforeEach(() => {
    limiter = new RateLimiterMemoria();
  });

  describe("RateLimiterMemoria", () => {
    it("deve permitir requisições dentro do limite configurado", () => {
      const res1 = limiter.consumir("ip-123", {
        limiteMaximo: 3,
        janelaSegundos: 60,
      });
      expect(res1.permitido).toBe(true);
      expect(res1.restante).toBe(2);

      const res2 = limiter.consumir("ip-123", {
        limiteMaximo: 3,
        janelaSegundos: 60,
      });
      expect(res2.permitido).toBe(true);
      expect(res2.restante).toBe(1);

      const res3 = limiter.consumir("ip-123", {
        limiteMaximo: 3,
        janelaSegundos: 60,
      });
      expect(res3.permitido).toBe(true);
      expect(res3.restante).toBe(0);
    });

    it("deve bloquear e retornar 429 com tempo de espera quando o limite for ultrapassado", () => {
      const config = { limiteMaximo: 2, janelaSegundos: 30 };

      limiter.consumir("ip-bloqueado", config);
      limiter.consumir("ip-bloqueado", config);

      const resBloqueado = limiter.consumir("ip-bloqueado", config);
      expect(resBloqueado.permitido).toBe(false);
      expect(resBloqueado.restante).toBe(0);
      expect(resBloqueado.tempoEsperaSegundos).toBeGreaterThan(0);
      expect(resBloqueado.tempoEsperaSegundos).toBeLessThanOrEqual(30);
    });

    it("deve isolar limites entre chaves/identificadores diferentes", () => {
      const config = { limiteMaximo: 1, janelaSegundos: 60 };

      const userA = limiter.consumir("user:alice", config);
      expect(userA.permitido).toBe(true);

      const userABloqueado = limiter.consumir("user:alice", config);
      expect(userABloqueado.permitido).toBe(false);

      const userB = limiter.consumir("user:bob", config);
      expect(userB.permitido).toBe(true);
    });

    it("deve permitir resetar uma chave específica (ex: após login bem-sucedido)", () => {
      const config = { limiteMaximo: 2, janelaSegundos: 60 };

      limiter.consumir("login:admin", config);
      limiter.consumir("login:admin", config);

      expect(limiter.consumir("login:admin", config).permitido).toBe(false);

      limiter.resetarChave("login:admin");

      const resAposReset = limiter.consumir("login:admin", config);
      expect(resAposReset.permitido).toBe(true);
      expect(resAposReset.restante).toBe(1);
    });
  });

  describe("extrairIpCliente", () => {
    it("deve extrair primeiro IP do cabeçalho x-forwarded-for quando atrás de proxy/OpenShift", () => {
      const req = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        },
      });

      const ip = extrairIpCliente(req);
      expect(ip).toBe("203.0.113.195");
    });

    it("deve usar cabeçalho x-real-ip se x-forwarded-for não estiver presente", () => {
      const req = new Request("http://localhost", {
        headers: {
          "x-real-ip": "198.51.100.4",
        },
      });

      const ip = extrairIpCliente(req);
      expect(ip).toBe("198.51.100.4");
    });

    it("deve retornar fallback seguro quando nenhum cabeçalho de IP estiver presente", () => {
      const req = new Request("http://localhost");
      const ip = extrairIpCliente(req);
      expect(ip).toBe("127.0.0.1");
    });
  });

  describe("formatarHeadersRateLimit", () => {
    it("deve formatar cabeçalhos HTTP padrão de rate limiting", () => {
      const headers = formatarHeadersRateLimit({
        limiteMaximo: 10,
        resultado: {
          permitido: true,
          restante: 8,
          tempoEsperaSegundos: 0,
          resetEmTimestamp: 1700000060,
        },
      });

      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("8");
      expect(headers["X-RateLimit-Reset"]).toBe("1700000060");
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("deve incluir Retry-After quando a requisição for bloqueada", () => {
      const headers = formatarHeadersRateLimit({
        limiteMaximo: 5,
        resultado: {
          permitido: false,
          restante: 0,
          tempoEsperaSegundos: 45,
          resetEmTimestamp: 1700000045,
        },
      });

      expect(headers["X-RateLimit-Limit"]).toBe("5");
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
      expect(headers["Retry-After"]).toBe("45");
    });
  });
});
