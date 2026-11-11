import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

process.env.AUTH_SECRET ||= "segredo-somente-para-testes";

if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
}
