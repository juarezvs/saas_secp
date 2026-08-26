import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, UsersRound } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { SuccessToast } from "@/components/ui/success-toast";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarJornadaPorId } from "@/modules/jornadas/infrastructure/repositories/jornada.repository";
import { HorarioForm } from "@/modules/jornadas/presentation/components/horario-form";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type JornadaDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<JornadaDetalheSearchParams>;
};

type JornadaDetalheSearchParams = {
  horarioSalvo?: string;
};

function formatarData(data: Date | null) {
  if (!data) return "Atual";
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export default async function JornadaDetalhePage({
  params,
  searchParams,
}: JornadaDetalhePageProps) {
  await exigirPermissaoOuRedirecionar("jornadas:gerenciar:global");

  const { id } = await params;
  const filtros: JornadaDetalheSearchParams = searchParams
    ? await searchParams
    : {};
  const jornada = await buscarJornadaPorId(id);

  if (!jornada) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {filtros.horarioSalvo === "1" && (
        <SuccessToast mensagem="As alterações foram gravadas com sucesso." />
      )}

      <Breadcrumb
        items={[
          { label: "Horário de Trabalho", href: "/jornadas" },
          { label: jornada.codigo },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Horário de Trabalho
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {jornada.nome}
          </h1>
          <p className="mt-2 font-mono text-sm text-[var(--muted-foreground)]">
            {jornada.codigo}
          </p>
        </div>

        <Link
          href={`/jornadas/${jornada.id}/editar`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Edit className="size-4" aria-hidden="true" />
          Editar horário
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Arts. 4º, §6º, e 8º"
        titulo="Carga diária e intervalo"
        descricao="O horário cadastrado será usado para comparar a carga mensal esperada com as horas efetivamente registradas pela pessoa."
      />

      <HorarioForm
        modo="editar"
        somenteLeitura
        valoresIniciais={{
          orgaoId: jornada.orgaoId,
          codigo: jornada.codigo,
          nome: jornada.nome,
          descricao: jornada.descricao,
          tipo: jornada.tipo,
          cargaDiariaMinutos: jornada.cargaDiariaMinutos,
          exigeIntervalo: jornada.exigeIntervalo,
          intervaloMinimoMinutos: jornada.intervaloMinimoMinutos,
          intervaloMaximoMinutos: jornada.intervaloMaximoMinutos,
          horarioEntradaPadrao: jornada.horarioEntradaPadrao,
          horarioSaidaPadrao: jornada.horarioSaidaPadrao,
          horarioDiferenciadoPermitido: jornada.horarioDiferenciadoPermitido,
          entradaMinimaDiferenciada: jornada.entradaMinimaDiferenciada,
          saidaMaximaDiferenciada: jornada.saidaMaximaDiferenciada,
          cargaSemanalMinutos: jornada.cargaSemanalMinutos,
          cargaMensalMinutos: jornada.cargaMensalMinutos,
          cargaMinimaDiariaMinutos: jornada.cargaMinimaDiariaMinutos,
          cargaMaximaDiariaMinutos: jornada.cargaMaximaDiariaMinutos,
          controlaHorario: jornada.controlaHorario,
          permiteFlexibilidade: jornada.permiteFlexibilidade,
          permiteBancoHoras: jornada.permiteBancoHoras,
          permiteHoraExtra: jornada.permiteHoraExtra,
          nucleoObrigatorioInicio: jornada.nucleoObrigatorioInicio,
          nucleoObrigatorioFim: jornada.nucleoObrigatorioFim,
          permanenciaMaximaMinutos: jornada.permanenciaMaximaMinutos,
          horarioLimiteVirada: jornada.horarioLimiteVirada,
          cruzaMeiaNoite: jornada.cruzaMeiaNoite,
          fundamentoNormativo: jornada.fundamentoNormativo,
          versao: jornada.versao,
          vigenciaInicio: jornada.vigenciaInicio,
          vigenciaFim: jornada.vigenciaFim,
          situacao: jornada.situacao,
          ativo: jornada.ativo,
          dias: jornada.dias.map((dia) => ({
            diaSemana: dia.diaSemana,
            tipoDia: dia.tipoDia,
            cargaPrevistaMinutos: dia.cargaPrevistaMinutos,
            faixas: dia.faixas.map((faixa) => ({
              tipo: faixa.tipo,
              horaInicio: faixa.horaInicio,
              horaFim: faixa.horaFim,
              ordem: faixa.ordem,
              cruzaMeiaNoite: faixa.cruzaMeiaNoite,
            })),
          })),
        }}
      />

      <section className="rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UsersRound className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Pessoas vinculadas</h2>
        </div>

        <div className="divide-y">
          {jornada.servidores.map((vinculo) => (
            <div
              key={vinculo.id}
              className="flex flex-col justify-between gap-3 p-5 md:flex-row md:items-center"
            >
              <div>
                <p className="font-semibold">{nomeServidor(vinculo.servidor)}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Matrícula: {vinculo.servidor.matricula}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {formatarData(vinculo.dataInicio)} →{" "}
                  {formatarData(vinculo.dataFim)}
                </p>
                <p className="mt-2 text-xs font-semibold">
                  {vinculo.horarioDiferenciadoAutorizado
                    ? "Horário diferenciado autorizado (06:00-19:00)"
                    : "Expediente padrão (08:00-18:00)"}
                </p>
                {vinculo.horarioDiferenciadoAutorizado &&
                  vinculo.justificativa && (
                    <p className="mt-1 max-w-2xl text-xs text-[var(--muted-foreground)]">
                      Base da autorização: {vinculo.justificativa}
                    </p>
                  )}
              </div>

              <span
                className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                  vinculo.ativo
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {vinculo.ativo ? "Vigente" : "Encerrada"}
              </span>
            </div>
          ))}

          {jornada.servidores.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhuma pessoa vinculada a este horário.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
