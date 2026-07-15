"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Loader2, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizarEstado, normalizarLogradouro } from "@/lib/normalizers";
import { buscarCep } from "@/lib/services/cep-service";
import type { CampoModelo, EnderecoConfig } from "@/lib/types";
import type { InputRef, TipoMascara } from "./types";
import { aplicarMascara, validarCEP, validarCPF, validarCNPJ } from "./types";

gsap.registerPlugin(useGSAP);

export interface GrupoCamposProps {
  titulo?: string;
  campos: CampoModelo[];
  /** valores atuais por key */
  values: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
  onAvancar: () => void;
  isLast?: boolean;
  submitting?: boolean;
  /**
   * Configuração de endereço — quando presente, habilita:
   *  - auto-fill ViaCEP ao digitar CEP (preenche logradouro/bairro/cidade/uf)
   *  - normalização automática do logradouro no blur (strip "rua"/"avenida"/etc.)
   *  - layout otimizado com CEP e rua em linhas próprias
   */
  camposEndereco?: EnderecoConfig;
}

/**
 * GrupoCampos — card com múltiplos campos relacionados (ex.: endereço).
 *
 * - Grid 1-col mobile, 2-col desktop (cada campo ocupa 1 célula; textarea 2)
 * - CEP auto-fill via `buscarCep` (ViaCEP). Quando o usuário digita 8 dígitos
 *   e sai do campo, busca o endereço e preenche logradouro/bairro/cidade/uf.
 * - Logradouro (rua) é normalizado no blur: "rua arnoldo beck" ou "arnoldo
 *   beck" viram "Rua Arnoldo Beck" — sem duplicar ou faltar o prefixo.
 * - Máscaras automáticas por tipo (CPF, CNPJ, CEP, telefone, data, estado).
 * - Validação interna (CPF/CNPJ/CEP) — exibe erro abaixo do campo.
 * - Enter no ÚLTIMO campo avança. Enter nos outros pula para o próximo.
 * - Botão mostra "Finalizar" na última etapa, "Avançar" caso contrário.
 *
 * ANIMAÇÃO DE ENTRADA: cada campo entra em stagger (fade + slide-up + scale
 * leve) — mais suave e amigável para o usuário idoso. O título também anima.
 */
export function GrupoCampos({
  titulo,
  campos,
  values,
  onFieldChange,
  onAvancar,
  isLast = false,
  submitting = false,
  camposEndereco,
}: GrupoCamposProps) {
  const root = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, InputRef>>({});
  const [erros, setErros] = useState<Record<string, string | null>>({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepEncontrado, setCepEncontrado] = useState(false);

  // Mount animation — stagger suave do título + cada campo
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!root.current) return;
      const tl = gsap.timeline();
      // título
      tl.fromTo(
        "[data-grupo='titulo']",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, ease: "power3.out" }
      );
      // cada campo com stagger
      tl.fromTo(
        "[data-grupo='campo']",
        { y: 18, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.42,
          ease: "power3.out",
          stagger: 0.06,
        },
        "-=0.15"
      );
      // botão final
      tl.fromTo(
        "[data-grupo='acao']",
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, ease: "power3.out" },
        "-=0.2"
      );
    },
    { scope: root }
  );

  // Focus no primeiro campo ao montar
  useEffect(() => {
    const t = window.setTimeout(() => {
      const first = campos[0];
      if (first) refs.current[first.key]?.focus();
    }, 80);
    return () => window.clearTimeout(t);
  }, [campos]);

  const detectarMascara = (c: CampoModelo): TipoMascara => {
    const k = c.key.toLowerCase();
    const p = c.pergunta.toLowerCase();
    // 1. KEY é a fonte autoritativa — só aplica máscara CPF/CNPJ/CEP se a key
    //    explicitamente diz isso. Evita falso positivo em campos como
    //    "Seu RG e CPF (opcional):" (key "rg") — a menção a "CPF" no label
    //    não significa que o campo deva ter máscara de CPF.
    if (/cpf/.test(k)) return "cpf";
    if (/cnpj/.test(k)) return "cnpj";
    if (/cep/.test(k)) return "cep";
    if (/telefone|fone|celular|whats/.test(k)) return "telefone";
    if (/data|nascimento/.test(k)) return "data";
    if (/_uf$|^uf$|estado/.test(k)) return "estado";
    // 2. PERGUNTA — só para casos onde a key não ajuda (ex.: "telefone"
    //    aparece no label mas a key é "contato"). Stricter: a pergunta
    //    precisa começar com a palavra-chave (não apenas conter).
    if (/^\s*(telefone|fone|celular|whats)/.test(p)) return "telefone";
    if (/^\s*(data|nascimento)/.test(p)) return "data";
    if (/sigla do estado/.test(p)) return "estado";
    if (c.tipo === "number") return "numero";
    return "texto";
  };

  const validar = (c: CampoModelo, v: string): string | null => {
    const tipo = detectarMascara(c);
    if (!v.trim()) return null; // required check happens at submit
    if (tipo === "cpf") return validarCPF(v);
    if (tipo === "cnpj") return validarCNPJ(v);
    if (tipo === "cep") return validarCEP(v);
    return null;
  };

  const handleChange = (c: CampoModelo, raw: string) => {
    const tipo = detectarMascara(c);
    const mascarado = aplicarMascara(raw, tipo);
    onFieldChange(c.key, mascarado);
    // limpa erro se voltou a válido
    if (erros[c.key]) {
      const novoErro = validar(c, mascarado);
      if (!novoErro) setErros((prev) => ({ ...prev, [c.key]: null }));
    }
    // quando o usuário muda o CEP, esconde o check de "encontrado"
    if (camposEndereco && c.key === camposEndereco.cepKey) {
      setCepEncontrado(false);
    }
  };

  const handleBlur = async (c: CampoModelo) => {
    const v = values[c.key] ?? "";
    // 1. validação
    const erro = validar(c, v);
    setErros((prev) => ({ ...prev, [c.key]: erro }));

    // 2. auto-normaliza estado
    const tipo = detectarMascara(c);
    if (tipo === "estado") {
      const norm = normalizarEstado(v);
      if (norm !== v) onFieldChange(c.key, norm);
    }

    // 3. auto-normaliza logradouro (rua) — strip/normaliza prefixo
    if (camposEndereco && c.key === camposEndereco.logradouroKey) {
      const norm = normalizarLogradouro(v);
      if (norm !== v) onFieldChange(c.key, norm);
    }

    // 4. CEP auto-fill
    if (camposEndereco && c.key === camposEndereco.cepKey) {
      const nums = v.replace(/\D/g, "");
      if (nums.length === 8) {
        setBuscandoCep(true);
        try {
          const end = await buscarCep(nums);
          if (end) {
            if (camposEndereco.logradouroKey && end.logradouro) {
              // ViaCEP retorna "Rua das Flores" já com prefixo — normaliza
              // para garantir formato consistente
              onFieldChange(
                camposEndereco.logradouroKey,
                normalizarLogradouro(end.logradouro)
              );
            }
            if (camposEndereco.bairroKey && end.bairro) {
              onFieldChange(camposEndereco.bairroKey, end.bairro);
            }
            if (camposEndereco.cidadeKey && end.localidade) {
              onFieldChange(camposEndereco.cidadeKey, end.localidade);
            }
            if (camposEndereco.ufKey && end.uf) {
              onFieldChange(camposEndereco.ufKey, end.uf);
            }
            setCepEncontrado(true);
            // foca no campo de número para o usuário continuar
            if (camposEndereco.numeroKey) {
              setTimeout(() => refs.current[camposEndereco.numeroKey]?.focus(), 50);
            }
          }
        } catch {
          // silent — usuário pode preencher manualmente
        } finally {
          setBuscandoCep(false);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (idx + 1 >= campos.length) {
        onAvancar();
      } else {
        const next = campos[idx + 1];
        if (next) refs.current[next.key]?.focus();
      }
    }
  };

  const handleAvancar = () => {
    // valida todos antes de avançar
    const novosErros: Record<string, string | null> = {};
    let primeiroComErro: CampoModelo | null = null;
    for (const c of campos) {
      const v = values[c.key] ?? "";
      const erro = validar(c, v);
      if (erro) {
        novosErros[c.key] = erro;
        if (!primeiroComErro) primeiroComErro = c;
      }
    }
    setErros(novosErros);
    if (primeiroComErro) {
      refs.current[primeiroComErro.key]?.focus();
      // shake
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.fromTo(
          refs.current[primeiroComErro.key],
          { x: -6 },
          { x: 0, duration: 0.4, ease: "elastic.out(1, 0.4)" }
        );
      }
      return;
    }
    onAvancar();
  };

  // Para layout do endereço: CEP e Rua em linha própria (full width),
  // Número e Complemento dividem linha, Bairro e Cidade dividem linha, UF sozinho.
  const isEnderecoField = (key: string) => {
    if (!camposEndereco) return false;
    return (
      key === camposEndereco.cepKey ||
      key === camposEndereco.logradouroKey ||
      key === camposEndereco.numeroKey ||
      key === camposEndereco.complementoKey ||
      key === camposEndereco.bairroKey ||
      key === camposEndereco.cidadeKey ||
      key === camposEndereco.ufKey
    );
  };

  const isFullWidth = (key: string) => {
    if (!camposEndereco) return false;
    // CEP e logradouro (rua) ocupam linha própria no desktop
    return key === camposEndereco.cepKey || key === camposEndereco.logradouroKey;
  };

  return (
    <div ref={root} className="space-y-4">
      {titulo && (
        <h3
          data-grupo="titulo"
          className="font-[family-name:var(--font-jakarta)] text-base sm:text-lg font-bold text-ink"
        >
          {titulo}
        </h3>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {campos.map((c, idx) => {
          const isTextarea = c.tipo === "textarea";
          const erro = erros[c.key];
          const tipo = detectarMascara(c);
          const buscando = buscandoCep && c.key === camposEndereco?.cepKey;
          const encontrado = cepEncontrado && c.key === camposEndereco?.cepKey;
          const isEnd = isEnderecoField(c.key);
          const fullW = isFullWidth(c.key) || isTextarea;
          return (
            <div
              key={c.key}
              data-grupo="campo"
              className={cn("space-y-1.5", fullW && "sm:col-span-2")}
            >
              <label
                htmlFor={`g-${c.key}`}
                className="block text-sm font-medium text-ink/75"
              >
                {c.pergunta}
                {buscando && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-[var(--blue-royal)]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    buscando CEP…
                  </span>
                )}
                {encontrado && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-[var(--selo-green)]">
                    <Check className="w-3 h-3" />
                    endereço encontrado
                  </span>
                )}
              </label>

              {isTextarea ? (
                <textarea
                  id={`g-${c.key}`}
                  ref={(el) => {
                    refs.current[c.key] = el;
                  }}
                  value={values[c.key] ?? ""}
                  onChange={(e) => handleChange(c, e.target.value)}
                  onBlur={() => handleBlur(c)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  placeholder={c.placeholder}
                  aria-invalid={!!erro}
                  rows={3}
                  disabled={submitting}
                  className={cn(
                    "w-full min-h-[3.5rem] px-4 py-3 text-base rounded-xl bg-surface border-2 outline-none transition-all resize-none disabled:opacity-60 placeholder:text-ink/40",
                    "focus:shadow-[0_8px_24px_-12px_rgba(37,84,199,0.45)]",
                    erro
                      ? "border-[var(--coral)] focus:border-[var(--coral)]"
                      : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]"
                  )}
                />
              ) : (
                <div className="relative">
                  <input
                    id={`g-${c.key}`}
                    ref={(el) => {
                      refs.current[c.key] = el;
                    }}
                    type="text"
                    value={values[c.key] ?? ""}
                    onChange={(e) => handleChange(c, e.target.value)}
                    onBlur={() => handleBlur(c)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    placeholder={c.placeholder}
                    aria-invalid={!!erro}
                    inputMode={c.tipo === "number" ? "decimal" : "text"}
                    disabled={submitting}
                    className={cn(
                      "w-full h-12 px-4 text-base rounded-xl bg-surface border-2 outline-none transition-all disabled:opacity-60 placeholder:text-ink/40",
                      "focus:shadow-[0_8px_24px_-12px_rgba(37,84,199,0.45)]",
                      erro
                        ? "border-[var(--coral)] focus:border-[var(--coral)]"
                        : isEnd && encontrado
                        ? "border-[var(--selo-green)] focus:border-[var(--selo-green)]"
                        : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]",
                      tipo === "cep" && "pr-10"
                    )}
                  />
                  {tipo === "cep" && (
                    <MapPin
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )}

              {erro && (
                <p className="text-xs text-[var(--coral)] font-medium flex items-center gap-1.5">
                  <span aria-hidden="true">⚠</span>
                  {erro}
                </p>
              )}

              {!erro && c.microcopy && (
                <p className="text-xs text-ink/55 italic flex items-start gap-1">
                  <span aria-hidden="true" className="text-[var(--selo-green)] mt-px">•</span>
                  <span>{c.microcopy}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div data-grupo="acao" className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handleAvancar}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando…
            </>
          ) : (
            <>
              {isLast ? "Finalizar" : "Avançar"}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        <kbd className="hidden sm:inline-flex text-xs text-ink/45 px-2 py-1.5 rounded border border-[var(--border)]">
          Enter ↵
        </kbd>
      </div>
    </div>
  );
}
