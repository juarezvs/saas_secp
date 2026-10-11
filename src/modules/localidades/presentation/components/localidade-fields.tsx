"use client";

import { useMemo, useState } from "react";

import type { EstadoComCidadesSelecao } from "@/modules/localidades/infrastructure/repositories/localidade.repository";

type LocalidadeFieldsProps = {
  estados: EstadoComCidadesSelecao[];
  ufInicial?: string | null;
  municipioInicial?: string | null;
  municipioIbgeInicial?: string | null;
  erroUf?: string;
  erroMunicipio?: string;
  erroMunicipioIbge?: string;
  cidadeObrigatoria?: boolean;
  ufObrigatoria?: boolean;
  mostrarCodigoIbge?: boolean;
  mostrarCidade?: boolean;
};

const classeCampo =
  "h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:cursor-not-allowed disabled:opacity-60";

export function cidadesDaUf(
  estados: EstadoComCidadesSelecao[],
  uf: string,
) {
  return estados.find((estado) => estado.sigla === uf)?.cidades ?? [];
}

export function LocalidadeFields({
  estados,
  ufInicial,
  municipioInicial,
  municipioIbgeInicial,
  erroUf,
  erroMunicipio,
  erroMunicipioIbge,
  cidadeObrigatoria = false,
  ufObrigatoria = false,
  mostrarCodigoIbge = true,
  mostrarCidade = true,
}: LocalidadeFieldsProps) {
  const ufNormalizada = ufInicial?.trim().toUpperCase() ?? "";
  const [uf, setUf] = useState(ufNormalizada);
  const cidades = useMemo(
    () => cidadesDaUf(estados, uf),
    [estados, uf],
  );
  const codigoInicial =
    municipioIbgeInicial ||
    cidades.find((cidade) => cidade.nome === municipioInicial)?.id.toString() ||
    "";
  const [municipioIbge, setMunicipioIbge] = useState(codigoInicial);
  const cidadeSelecionada = cidades.find(
    (cidade) => cidade.id.toString() === municipioIbge,
  );
  const municipio =
    cidadeSelecionada?.nome ??
    (uf === ufNormalizada && municipioIbge === codigoInicial
      ? (municipioInicial ?? "")
      : "");

  return (
    <>
      <div className={mostrarCidade ? "space-y-2" : "hidden"}>
        <label htmlFor="uf" className="text-sm font-semibold">Estado (UF)</label>
        <select
          id="uf"
          name="uf"
          value={uf}
          required={ufObrigatoria}
          onChange={(event) => {
            setUf(event.currentTarget.value);
            setMunicipioIbge("");
          }}
          className={classeCampo}
        >
          <option value="">Selecione o estado</option>
          {estados.map((estado) => (
            <option key={estado.id} value={estado.sigla}>
              {estado.sigla} - {estado.nome}
            </option>
          ))}
        </select>
        {erroUf ? <p className="text-sm text-red-600">{erroUf}</p> : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="municipioIbge" className="text-sm font-semibold">Cidade</label>
        <select
          id="municipioIbge"
          name="municipioIbge"
          value={municipioIbge}
          required={cidadeObrigatoria}
          disabled={!uf}
          onChange={(event) => setMunicipioIbge(event.currentTarget.value)}
          className={classeCampo}
        >
          <option value="">{uf ? "Selecione a cidade" : "Selecione primeiro o estado"}</option>
          {cidades.map((cidade) => (
            <option key={cidade.id} value={cidade.id}>{cidade.nome}</option>
          ))}
        </select>
        {erroMunicipio || erroMunicipioIbge ? (
          <p className="text-sm text-red-600">{erroMunicipio ?? erroMunicipioIbge}</p>
        ) : null}
      </div>

      <input type="hidden" name="municipio" value={municipio} />
      {mostrarCidade && mostrarCodigoIbge ? (
        <div className="space-y-2">
          <label htmlFor="codigoIbgeExibicao" className="text-sm font-semibold">Código IBGE</label>
          <input
            id="codigoIbgeExibicao"
            value={municipioIbge}
            readOnly
            tabIndex={-1}
            placeholder="Preenchido pela cidade"
            className={`${classeCampo} bg-[var(--muted)]`}
          />
        </div>
      ) : null}
    </>
  );
}
