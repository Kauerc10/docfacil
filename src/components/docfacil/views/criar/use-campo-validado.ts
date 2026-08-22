"use client";

import { useCallback, useState } from "react";
import { aplicarMascara, detectarMascara } from "./types";
import type { CampoModelo } from "@/lib/types";
import { validarCampoDocumento } from "@/lib/validation/document-fields";

/**
 * useCampoValidado — encapsula máscara + validação determinística para
 * qualquer input de campo do fluxo criar.
 *
 * Reaproveitado por:
 *  - CampoPergunta (campo único)
 *  - ClausulaCard (campos extras)
 *
 * As máscaras continuam sendo uma preocupação visual; a regra de validade do
 * dado é compartilhada com o servidor, que permanece a autoridade final.
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
      if (erro) {
        const novoErro = validarCampoDocumento(campo, mascarado);
        if (!novoErro) setErro(null);
      }
    },
    [campo, erro, onChange, tipo]
  );

  const handleBlur = useCallback(() => {
    const novoErro = validarCampoDocumento(campo, value);
    setErro(novoErro);
    return novoErro;
  }, [campo, value]);

  const validar = useCallback(() => {
    const novoErro = validarCampoDocumento(campo, value);
    setErro(novoErro);
    return novoErro;
  }, [campo, value]);

  return { tipo, erro, setErro, handleChange, handleBlur, validar };
}
