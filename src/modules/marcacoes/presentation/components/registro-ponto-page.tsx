"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import {
  BadgeCheck,
  Clock3,
  Fingerprint,
  PenLine,
  ScanFace,
  UserRound,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Button, Card, Modal } from "@/components/ui";
import { registrarMarcacaoWebAutorizadaAction } from "@/modules/marcacoes-brutas/application/actions/registrar-marcacao-web.action";
import { obterRotuloTipoMarcacao } from "../../application/services/classificar-marcacao.service";
import { OrigemMarcacaoIcon } from "./origem-marcacao-icon";

const ValidacaoFacialCard = dynamic(
  () =>
    import("@/modules/biometria/presentation/components/validacao-facial-card").then(
      (modulo) => modulo.ValidacaoFacialCard,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-md border p-4 text-sm text-muted-foreground"
        role="status"
      >
        Preparando reconhecimento facial...
      </div>
    ),
  },
);

type RegistroPontoPageProps = {
  servidor: {
    nome: string;
    matricula: string;
    unidade: string;
    jornada: string;
    biometriaAtiva: boolean;
  } | null;
  marcacoes: Array<{
    id: string;
    dataHora: string;
    fusoHorario?: string | null;
    tipo: string;
    fonte: string;
    status: string;
  }>;
  proximaMarcacao: string | null;
  fluxoConcluido: boolean;
  podeRegistrarWeb: boolean;
  podeRegistrarFacial: boolean;
};

export function RegistroPontoPage({
  servidor,
  marcacoes,
  proximaMarcacao,
  fluxoConcluido,
  podeRegistrarWeb,
  podeRegistrarFacial,
}: RegistroPontoPageProps) {
  const [reconhecimentoAberto, setReconhecimentoAberto] = useState(false);
  const deveRegistrarWeb = podeRegistrarWeb;
  const deveRegistrarFacial = !deveRegistrarWeb && podeRegistrarFacial;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Marcações", href: "/marcacoes" },
          { label: "Registrar horário" },
        ]}
      />

      <PageHeader
        icon={Clock3}
        titulo="Registrar horário"
        descricao="Registro excepcional de ponto pelo SECP, liberado somente para servidores com autorização específica."
        artigo="Art. 6"
        regraTitulo="Registro eletrônico de frequência"
        regraDescricao="A marcação deve identificar o servidor, registrar data e hora e preservar a rastreabilidade da origem."
      />

      {!servidor ? (
        <Card className="p-6">
          <h2 className="font-semibold">Servidor não localizado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Não foi encontrado um servidor ativo vinculado ao usuário atual.
          </p>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <Card className="overflow-hidden">
              <div className="border-b bg-blue-50/70 p-5 dark:bg-blue-950/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300">
                      Próxima marcação
                    </p>
                    <h2 className="mt-1 text-2xl font-bold">
                      {fluxoConcluido
                        ? "Jornada registrada"
                        : (proximaMarcacao ?? "Aguardando classificacao")}
                    </h2>
                  </div>
                  <Badge variant={fluxoConcluido ? "regular" : "pendente"}>
                    {marcacoes.length} registro
                    {marcacoes.length === 1 ? "" : "s"} hoje
                  </Badge>
                </div>
              </div>

              <div className="p-5 md:p-6">
                {fluxoConcluido ? (
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 size-6 text-green-700" />
                    <div>
                      <p className="font-semibold">
                        Todas as marcações ordinarias foram registradas.
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Consulte o espelho de ponto para acompanhar a apuração
                        da jornada.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-green-50 p-2.5 text-green-800 dark:bg-green-950 dark:text-green-300">
                        <Fingerprint className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {deveRegistrarFacial
                            ? "Confirmação facial obrigatória"
                            : "Registro web autorizado"}
                        </p>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                          {deveRegistrarFacial
                            ? "Ao continuar, a câmera será aberta em uma janela compacta para validar sua identidade."
                            : "Ao registrar, o SECP gravará a marcação atual como registro web autorizado e processará a frequência."}
                        </p>
                      </div>
                    </div>
                    {deveRegistrarWeb ? (
                      <RegistrarMarcacaoWebAssinaturaModal
                        proximaMarcacao={proximaMarcacao}
                      />
                    ) : deveRegistrarFacial ? (
                      <Button
                        size="lg"
                        onClick={() => setReconhecimentoAberto(true)}
                        leftIcon={
                          <ScanFace className="size-5" aria-hidden="true" />
                        }
                      >
                        Registrar com reconhecimento facial
                      </Button>
                    ) : (
                      <Badge variant="pendente">
                        Registro pelo SECP não autorizado
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2">
                <UserRound className="size-5 text-blue-900 dark:text-blue-300" />
                <h2 className="font-semibold">Servidor ativo</h2>
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <InfoLinha label="Nome" valor={servidor.nome} />
                <InfoLinha label="Matrícula" valor={servidor.matricula} />
                <InfoLinha label="Unidade" valor={servidor.unidade} />
                <InfoLinha label="Jornada" valor={servidor.jornada} />
              </dl>
            </Card>
          </section>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div className="flex items-center gap-2">
                <Clock3 className="size-5 text-blue-900 dark:text-blue-300" />
                <h2 className="text-lg font-semibold">Marcações do dia</h2>
              </div>
              <Link
                href="/marcacoes"
                className="text-sm font-semibold text-blue-800 hover:underline dark:text-blue-300"
              >
                Ver histórico
              </Link>
            </div>

            <div className="divide-y">
              {marcacoes.map((marcacao, index) => (
                <div
                  key={marcacao.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {obterRotuloTipoMarcacao(marcacao.tipo)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {formatarHora(
                            marcacao.dataHora,
                            marcacao.fusoHorario,
                          )}
                        </span>
                        <OrigemMarcacaoIcon origem={marcacao.fonte} />
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      marcacao.status === "VALIDA" ? "regular" : "pendente"
                    }
                  >
                    {marcacao.status}
                  </Badge>
                </div>
              ))}

              {marcacoes.length === 0 && (
                <div className="p-8 text-center">
                  <Clock3 className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 font-semibold">Nenhuma marcação hoje</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O primeiro registro será identificado como entrada.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Modal
            open={reconhecimentoAberto}
            onOpenChange={setReconhecimentoAberto}
            title="Confirmar identidade facial"
            description={`Validacao para registrar ${
              proximaMarcacao?.toLowerCase() ?? "o horário atual"
            }.`}
            className="max-h-[92vh] overflow-y-auto sm:w-[min(92vw,480px)]"
          >
            {servidor.biometriaAtiva ? (
              <ValidacaoFacialCard compact />
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <p className="font-semibold">Biometria facial não cadastrada</p>
                <p className="mt-2 text-sm leading-6">
                  Cadastre sua biometria antes de registrar o ponto por
                  reconhecimento facial.
                </p>
                <Link
                  href="/biometria/cadastro"
                  className="mt-4 inline-flex rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
                >
                  Cadastrar biometria
                </Link>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}

function RegistrarMarcacaoWebAssinaturaModal({
  proximaMarcacao,
}: {
  proximaMarcacao: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState(
    registrarMarcacaoWebAutorizadaAction,
    { erro: null, sucesso: null },
  );
  const rotuloMarcacao = proximaMarcacao?.toLowerCase() ?? "o horário atual";

  return (
    <>
      <Button
        type="button"
        size="lg"
        onClick={() => setAberto(true)}
        leftIcon={<Clock3 className="size-5" aria-hidden="true" />}
      >
        Registrar via sistema web
      </Button>

      <Modal
        open={aberto}
        onOpenChange={setAberto}
        title="Assinatura de Documento"
        description={`Assine para registrar ${rotuloMarcacao} pelo sistema web.`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={pendente}
              leftIcon={<PenLine className="size-4" aria-hidden="true" />}
              onClick={(event) => {
                const modal = event.currentTarget.closest('[role="dialog"]');
                const form = modal?.querySelector("form");
                if (form instanceof HTMLFormElement) {
                  form.requestSubmit();
                }
              }}
            >
              Assinar e registrar
            </Button>
          </>
        }
      >
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="senhaAssinaturaMarcacaoWeb"
              className="text-sm font-semibold"
            >
              Senha
            </label>
            <input
              id="senhaAssinaturaMarcacaoWeb"
              name="senhaAssinatura"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
            {estado.erro ? (
              <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                {estado.erro}
              </p>
            ) : null}
            {estado.sucesso ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {estado.sucesso}
              </p>
            ) : null}
          </div>
        </form>

        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          A marcação será gravada com data e hora atuais, origem web autorizada
          e assinatura eletrônica do usuário logado.
        </div>
      </Modal>
    </>
  );
}

function formatarHora(dataHora: string, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: fusoHorario ?? "America/Manaus",
  }).format(new Date(dataHora));
}

function InfoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium">{valor}</dd>
    </div>
  );
}
