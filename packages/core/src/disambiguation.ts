import type { ContextDisambiguator, RawToken } from "./types";

export class NoopDisambiguator implements ContextDisambiguator {
  disambiguate(rawTokens: readonly RawToken[]): string[] {
    return rawTokens.map(([, converted]) => converted);
  }
}
