type ServidorComNomeFuncional = {
  nomeFuncional?: string | null;
  usuario?: {
    nome?: string | null;
  } | null;
};

export function nomeServidor(servidor?: ServidorComNomeFuncional | null) {
  return servidor?.nomeFuncional?.trim() || servidor?.usuario?.nome?.trim() || "";
}

