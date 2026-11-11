export interface RateLimitConfig {
  limiteMaximo: number;
  janelaSegundos: number;
}

export interface ResultadoRateLimit {
  permitido: boolean;
  restante: number;
  tempoEsperaSegundos: number;
  resetEmTimestamp: number;
}

interface RegistroJanela {
  tentativas: number;
  resetEmTimestamp: number;
}

export class RateLimiterMemoria {
  private buckets = new Map<string, RegistroJanela>();

  consumir(chave: string, config: RateLimitConfig): ResultadoRateLimit {
    const agoraMs = Date.now();
    const agoraSegundos = Math.floor(agoraMs / 1000);
    const registro = this.buckets.get(chave);

    if (!registro || agoraSegundos >= registro.resetEmTimestamp) {
      // Nova janela de tempo
      const resetEmTimestamp = agoraSegundos + config.janelaSegundos;
      this.buckets.set(chave, {
        tentativas: 1,
        resetEmTimestamp,
      });

      return {
        permitido: true,
        restante: config.limiteMaximo - 1,
        tempoEsperaSegundos: 0,
        resetEmTimestamp,
      };
    }

    // Janela ativa
    if (registro.tentativas >= config.limiteMaximo) {
      const tempoEsperaSegundos = Math.max(
        1,
        registro.resetEmTimestamp - agoraSegundos
      );
      return {
        permitido: false,
        restante: 0,
        tempoEsperaSegundos,
        resetEmTimestamp: registro.resetEmTimestamp,
      };
    }

    registro.tentativas += 1;
    const restante = Math.max(0, config.limiteMaximo - registro.tentativas);

    return {
      permitido: true,
      restante,
      tempoEsperaSegundos: 0,
      resetEmTimestamp: registro.resetEmTimestamp,
    };
  }

  resetarChave(chave: string): void {
    this.buckets.delete(chave);
  }

  limparTudo(): void {
    this.buckets.clear();
  }
}

// Instâncias globais singleton para rate limiting por recurso
const globalLoginRateLimiter = new RateLimiterMemoria();
const globalRunnerRateLimiter = new RateLimiterMemoria();

export function getLoginRateLimiter(): RateLimiterMemoria {
  return globalLoginRateLimiter;
}

export function getRunnerRateLimiter(): RateLimiterMemoria {
  return globalRunnerRateLimiter;
}

export function resetGlobalRateLimiters(): void {
  globalLoginRateLimiter.limparTudo();
  globalRunnerRateLimiter.limparTudo();
}

/**
 * Extrai o IP real do cliente com suporte a proxies reversos / Ingress / OpenShift
 */
export function extrairIpCliente(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp && xRealIp.trim().length > 0) {
    return xRealIp.trim();
  }

  return "127.0.0.1";
}

/**
 * Converte o resultado do rate limiter nos cabeçalhos HTTP padrão
 */
export function formatarHeadersRateLimit(params: {
  limiteMaximo: number;
  resultado: ResultadoRateLimit;
}): Record<string, string> {
  const { limiteMaximo, resultado } = params;
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limiteMaximo),
    "X-RateLimit-Remaining": String(resultado.restante),
    "X-RateLimit-Reset": String(resultado.resetEmTimestamp),
  };

  if (!resultado.permitido) {
    headers["Retry-After"] = String(resultado.tempoEsperaSegundos);
  }

  return headers;
}
