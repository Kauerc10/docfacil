"use client";

import { useCallback, useState } from "react";
import { aplicarMascara, detectarMascara, validarPorTipo } from "./types";
import type { CampoModelo } from "@/lib/types";

/**
 * useCampoValidado — encapsula máscara + validação determinística para
 * qualquer input de campo do fluxo criar.
 *
 * Reaproveitado por:
 *  - CampoPergunta (campo único)
 *  - ClausulaCard (campos extras)
 *
 * Centraliza a lógica que antes só existia no GrupoCampos, garantindo
 * consistência: um CPF em campo extra de cláusula agora é formatado e
 * validado igual ao CPF no GrupoCampos.
 *
 * @param campo   definição do campo (key, pergunta, tipo)
 * @param value    valor atual (controlado)
 * @param onChange callback para atualizar o valor no parent
 * @returns handlers prontos para plugar no input + estado de erro
 */
export function useCampoValidado(
  campo: CampoModelo,
  value: string,
  onChange: (v: string) => void
) {
  const [erro, setErro] = useState<string | null>(null);

  const tipo = detectarMascara(campo);

  const handleChange = useCallback(
    (raw: string) => {
      const mascarado = aplicarMascara(raw, tipo);
      onChange(mascarado);
      // limpa erro se voltou a válido
      if (erro) {
        const novoErro = validarPorTipo(tipo, mascarado);
        if (!novoErro) setErro(null);
      }
    },
    [erro, onChange, tipo]
  );

  const handleBlur = useCallback(() => {
    const novoErro = validarPorTipo(tipo, value);
    setErro(novoErro);
    return novoErro;
  }, [tipo, value]);

  const validar = useCallback(() => {
    const novoErro = validarPorTipo(tipo, value);
    setErro(novoErro);
    return novoErro;
  }, [tipo, value]);

  return { tipo, erro, setErro, handleChange, handleBlur, validar };
}
