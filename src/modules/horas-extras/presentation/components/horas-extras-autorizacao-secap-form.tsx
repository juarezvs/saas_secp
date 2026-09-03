"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { registrarAutorizacaoHorasExtrasSecapAction } from "../../application/actions/registrar-autorizacao-horas-extras-secap.action";
import type { RegistrarAutorizacaoHoraExtraSecapFormState } from "../../application/schemas/horas-extras-autorizacao-secap.schema";

type OrgaoOption = {
  id: string;
  sigla: string;
  nome: string;
};

type UnidadeOption = {
  id: string;
  orgaoId: string;
  sigla: string;
  nome: string;
};

type ServidorOption = {
  id: string;
  matricula: string;
  nomeFuncional: string | null;
  usuario: {
    nome: string;
  };
  lotacoes: Array<{
    unidade: {
      sigla: string;
      nome: string;
    };
  }>;
};

type ServidorAutorizadoForm = {
  servidorId: string;
  unidadeId: string;
  periodoInicio: string;
  periodoFim: string;
  quantidadeMaximaMinutos: number;
  diaUtilMinutos: number;
  sabadoMinutos: number;
  domingoMinutos: number;
  faixaInicio: string;
  faixaFim: string;
};

type Props = {
  orgaos: OrgaoOption[];
  unidades: UnidadeOption[];
  servidores: ServidorOption[];
};

const estadoInicial: RegistrarAutorizacaoHoraExtraSecapFormState = {
  sucesso: false,
  mensagem: "",
};

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function competenciaAtual() {
  return new Date().toISOString().slice(0, 7);
}

function novoServidor(): ServidorAutorizadoForm {
  const competencia = competenciaAtual();

  return {
    servidorId: "",
    unidadeId: "",
    periodoInicio: `${competencia}-01`,
    periodoFim: `${competencia}-28`,
    quantidadeMaximaMinutos: 0,
    diaUtilMinutos: 0,
    sabadoMinutos: 0,
    domingoMinutos: 0,
    faixaInicio: "07:00",
    faixaFim: "",
  };
}

function minutosParaRotulo(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function minutosParaHorasInput(minutos: number) {
  return Number((Number(minutos || 0) / 60).toFixed(2));
}

function horasParaMinutos(horas: string) {
  return Math.round(Number(horas || 0) * 60);
}

export function HorasExtrasAutorizacaoSecapForm({
  orgaos,
  unidades,
  servidores,
}: Props) {
  const [state, formAction, pending] = useActionState(
    registrarAutorizacaoHorasExtrasSecapAction,
    estadoInicial,
  );
  const [orgaoId, setOrgaoId] = useState(orgaos[0]?.id ?? "");
  const [unidadeId, setUnidadeId] = useState("");
  const [processoSei, setProcessoSei] = useState("");
  const [documentoAutorizacao, setDocumentoAutorizacao] = useState("");
  const [mesReferencia, setMesReferencia] = useState(competenciaAtual());
  const [dataAutorizacao, setDataAutorizacao] = useState(hojeIso());
  const [autoridadeAutorizadora, setAutoridadeAutorizadora] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [origemDocumento, setOrigemDocumento] = useState("");
  const [modalidade, setModalidade] = useState("PERIODO_QUANTIDADE_GLOBAL");
  const [confirmarRegistro, setConfirmarRegistro] = useState(true);
  const [servidoresAutorizados, setServidoresAutorizados] = useState<
    ServidorAutorizadoForm[]
  >([novoServidor()]);

  const unidadesDoOrgao = useMemo(
    () => unidades.filter((unidade) => unidade.orgaoId === orgaoId),
    [orgaoId, unidades],
  );
  const unidadesDoOrgaoOptions = useMemo(
    () =>
      unidadesDoOrgao.map((unidade) => ({
        value: unidade.id,
        label: `${unidade.sigla} - ${unidade.nome}`,
        searchText: `${unidade.sigla} ${unidade.nome}`,
      })),
    [unidadesDoOrgao],
  );
  const servidoresOptions = useMemo(
    () =>
      servidores.map((item) => {
        const lotacoes = item.lotacoes
          .map((lotacao) => `${lotacao.unidade.sigla} ${lotacao.unidade.nome}`)
          .join(" ");
        const nome = item.nomeFuncional ?? item.usuario.nome;

        return {
          value: item.id,
          label: `${item.matricula} - ${nome}`,
          searchText: `${item.matricula} ${nome} ${lotacoes}`,
        };
      }),
    [servidores],
  );
  const totalAutorizado = servidoresAutorizados.reduce(
    (total, servidor) => total + Number(servidor.quantidadeMaximaMinutos || 0),
    0,
  );
  const dadosJson = useMemo(
    () =>
      JSON.stringify({
        orgaoId,
        unidadeId,
        processoSei,
        documentoAutorizacao,
        mesReferencia,
        dataAutorizacao,
        autoridadeAutorizadora,
        observacoes,
        origemDocumento,
        modalidade,
        confirmarRegistro,
        servidores: servidoresAutorizados.map((servidor) => ({
          servidorId: servidor.servidorId,
          unidadeId: servidor.unidadeId,
          periodoInicio: servidor.periodoInicio,
          periodoFim: servidor.periodoFim,
          quantidadeMaximaMinutos: Number(servidor.quantidadeMaximaMinutos),
          limitesPorTipoDia: {
            DIA_UTIL: Number(servidor.diaUtilMinutos),
            SABADO: Number(servidor.sabadoMinutos),
            DOMINGO: Number(servidor.domingoMinutos),
            FERIADO_NACIONAL: Number(servidor.domingoMinutos),
            FERIADO_ESTADUAL: Number(servidor.domingoMinutos),
            FERIADO_MUNICIPAL: Number(servidor.domingoMinutos),
            FERIADO_REGIMENTAL: Number(servidor.domingoMinutos),
          },
          regras:
            servidor.faixaInicio || servidor.faixaFim
              ? [
                  {
                    faixaInicio: servidor.faixaInicio || undefined,
                    faixaFim: servidor.faixaFim || undefined,
                  },
                ]
              : [],
        })),
      }),
    [
      orgaoId,
      unidadeId,
      processoSei,
      documentoAutorizacao,
      mesReferencia,
      dataAutorizacao,
      autoridadeAutorizadora,
      observacoes,
      origemDocumento,
      modalidade,
      confirmarRegistro,
      servidoresAutorizados,
    ],
  );

  function atualizarServidor(
    index: number,
    patch: Partial<ServidorAutorizadoForm>,
  ) {
    setServidoresAutorizados((atuais) =>
      atuais.map((servidor, atualIndex) =>
        atualIndex === index ? { ...servidor, ...patch } : servidor,
      ),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="dados" value={dadosJson} />

      {state.mensagem && (
        <div
          className={
            state.sucesso
              ? "rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-950"
              : "rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
          }
        >
          {state.mensagem}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados da autorização</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Órgão</span>
            <select
              value={orgaoId}
              onChange={(event) => {
                setOrgaoId(event.target.value);
                setUnidadeId("");
                setServidoresAutorizados((atuais) =>
                  atuais.map((servidor) => ({ ...servidor, unidadeId: "" })),
                );
              }}
              className="h-10 w-full rounded-md border bg-background px-3"
              required
            >
              <option value="">Selecione</option>
              {orgaos.map((orgao) => (
                <option key={orgao.id} value={orgao.id}>
                  {orgao.sigla} - {orgao.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Unidade</span>
            <SearchableSelect
              key={`unidade-autorizacao-${orgaoId}`}
              id="unidadeId"
              name="unidadeId"
              defaultValue={unidadeId}
              onValueChange={setUnidadeId}
              options={unidadesDoOrgaoOptions}
              placeholder="Selecione"
              searchPlaceholder="Pesquisar por sigla ou nome..."
              emptyMessage="Nenhuma unidade encontrada."
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Processo SEI</span>
            <input
              value={processoSei}
              onChange={(event) => setProcessoSei(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Documento de autorização</span>
            <input
              value={documentoAutorizacao}
              onChange={(event) => setDocumentoAutorizacao(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Competência</span>
            <input
              type="month"
              value={mesReferencia}
              onChange={(event) => setMesReferencia(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Data da autorização</span>
            <input
              type="date"
              value={dataAutorizacao}
              onChange={(event) => setDataAutorizacao(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Autoridade autorizadora</span>
            <input
              value={autoridadeAutorizadora}
              onChange={(event) => setAutoridadeAutorizadora(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Origem/documento externo</span>
            <input
              value={origemDocumento}
              onChange={(event) => setOrigemDocumento(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Modalidade</span>
            <select
              value={modalidade}
              onChange={(event) => setModalidade(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
            >
              <option value="PERIODO">Período</option>
              <option value="DATAS_ESPECIFICAS">Datas específicas</option>
              <option value="PERIODO_QUANTIDADE_GLOBAL">
                Período + quantidade global
              </option>
              <option value="PERIODO_LIMITE_TIPO_DIA">
                Período + limite por tipo de dia
              </option>
            </select>
          </label>

          <label className="flex items-center gap-2 pt-7 text-sm">
            <input
              type="checkbox"
              checked={confirmarRegistro}
              onChange={(event) => setConfirmarRegistro(event.target.checked)}
              className="size-4"
            />
            <span>Registrar no SECP</span>
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Observações</span>
            <textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Servidores autorizados</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={() =>
              setServidoresAutorizados((atuais) => [...atuais, novoServidor()])
            }
          >
            Adicionar servidor
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {servidoresAutorizados.map((servidor, index) => (
            <div key={index} className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Servidor {index + 1}</p>
                {servidoresAutorizados.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="size-4" />}
                    onClick={() =>
                      setServidoresAutorizados((atuais) =>
                        atuais.filter((_, atualIndex) => atualIndex !== index),
                      )
                    }
                  >
                    Remover
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="font-medium">Servidor</span>
                  <SearchableSelect
                    id={`servidores-${index}-servidorId`}
                    name={`servidores[${index}].servidorId`}
                    defaultValue={servidor.servidorId}
                    onValueChange={(value) =>
                      atualizarServidor(index, { servidorId: value })
                    }
                    options={servidoresOptions}
                    placeholder="Selecione"
                    searchPlaceholder="Pesquisar por matrícula, nome ou lotação..."
                    emptyMessage="Nenhum servidor encontrado."
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Unidade do servidor</span>
                  <SearchableSelect
                    key={`servidor-${index}-unidade-${orgaoId}`}
                    id={`servidores-${index}-unidadeId`}
                    name={`servidores[${index}].unidadeId`}
                    defaultValue={servidor.unidadeId}
                    onValueChange={(value) =>
                      atualizarServidor(index, { unidadeId: value })
                    }
                    options={unidadesDoOrgaoOptions}
                    placeholder="Selecione"
                    searchPlaceholder="Pesquisar por sigla ou nome..."
                    emptyMessage="Nenhuma unidade encontrada."
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Início</span>
                  <input
                    type="date"
                    value={servidor.periodoInicio}
                    onChange={(event) =>
                      atualizarServidor(index, {
                        periodoInicio: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Fim</span>
                  <input
                    type="date"
                    value={servidor.periodoFim}
                    onChange={(event) =>
                      atualizarServidor(index, { periodoFim: event.target.value })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Total autorizado (horas)</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.25}
                    inputMode="decimal"
                    value={minutosParaHorasInput(
                      servidor.quantidadeMaximaMinutos,
                    )}
                    onChange={(event) =>
                      atualizarServidor(index, {
                        quantidadeMaximaMinutos: horasParaMinutos(
                          event.target.value,
                        ),
                      })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Dia útil</span>
                  <input
                    type="number"
                    min={0}
                    value={servidor.diaUtilMinutos}
                    onChange={(event) =>
                      atualizarServidor(index, {
                        diaUtilMinutos: Number(event.target.value),
                      })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Sábado</span>
                  <input
                    type="number"
                    min={0}
                    value={servidor.sabadoMinutos}
                    onChange={(event) =>
                      atualizarServidor(index, {
                        sabadoMinutos: Number(event.target.value),
                      })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Domingo/feriado</span>
                  <input
                    type="number"
                    min={0}
                    value={servidor.domingoMinutos}
                    onChange={(event) =>
                      atualizarServidor(index, {
                        domingoMinutos: Number(event.target.value),
                      })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Faixa início</span>
                  <input
                    type="time"
                    value={servidor.faixaInicio}
                    onChange={(event) =>
                      atualizarServidor(index, {
                        faixaInicio: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Faixa fim</span>
                  <input
                    type="time"
                    value={servidor.faixaFim}
                    onChange={(event) =>
                      atualizarServidor(index, { faixaFim: event.target.value })
                    }
                    className="h-10 w-full rounded-md border bg-background px-3"
                  />
                </label>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/60 p-3 text-sm">
            <span>Total autorizado</span>
            <strong className="tabular-nums">{minutosParaRotulo(totalAutorizado)}</strong>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={pending}
          leftIcon={<Save className="size-4" />}
        >
          Salvar autorização
        </Button>
      </div>
    </form>
  );
}
