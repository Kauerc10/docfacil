/**
 * ViaCEP service — auto-preenchimento de endereço via CEP.
 * API gratuita: https://viacep.com.br/ws/{cep}/json/
 */
export interface EnderecoCep {
  logradouro: string; bairro: string; localidade: string; uf: string; complemento?: string;
}

export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as EnderecoCep & { erro?: boolean };
    if (data.erro) return null;
    return {
      logradouro: data.logradouro || "", bairro: data.bairro || "",
      localidade: data.localidade || "", uf: data.uf || "",
    };
  } catch { return null; }
}
