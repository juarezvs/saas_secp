"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeCheck,
  Clock3,
  Fingerprint,
  Gauge,
  PenLine,
  ScanFace,
  ShieldCheck,
  UserRound,
  type LucideIcon,
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
  const [marcacaoDestacadaId, setMarcacaoDestacadaId] = useState<string | null>(
    null,
  );
  const deveRegistrarWeb = podeRegistrarWeb;
  const deveRegistrarFacial = !deveRegistrarWeb && podeRegistrarFacial;
  const ultimaMarcacao = marcacoes[marcacoes.length - 1] ?? null;
  const progressoFluxo = Math.min(marcacoes.length, 4);
  const destacarMarcacaoRegistrada = useCallback((marcacaoId: string) => {
    setMarcacaoDestacadaId(marcacaoId);
  }, []);

  useEffect(() => {
    if (!marcacaoDestacadaId) return;

    const timer = window.setTimeout(() => {
      setMarcacaoDestacadaId(null);
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [marcacaoDestacadaId]);

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
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
              <div className="grid gap-5 bg-slate-950 p-5 text-white md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                    Registro excepcional autorizado
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-normal">
                    {fluxoConcluido
                      ? "Jornada registrada"
                      : (proximaMarcacao ?? "Aguardando classificação")}
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <StatusResumo
                      icon={Gauge}
                      label="Fluxo do dia"
                      valor={`${progressoFluxo}/4`}
                    />
                    <StatusResumo
                      icon={Clock3}
                      label="Última marcação"
                      valor={
                        ultimaMarcacao
                          ? formatarHora(
                              ultimaMarcacao.dataHora,
                              ultimaMarcacao.fusoHorario,
                            )
                          : "Sem registro"
                      }
                    />
                    <StatusResumo
                      icon={ShieldCheck}
                      label="Origem liberada"
                      valor={deveRegistrarWeb ? "Sistema web" : "Facial"}
                    />
                  </div>
                </div>
                <RelogioAgora />
              </div>

              <div className="p-5 md:p-6">
                {fluxoConcluido ? (
                  <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
                    <BadgeCheck className="mt-0.5 size-6 text-green-700" />
                    <div>
                      <p className="font-semibold">
                        Todas as marcações ordinárias foram registradas.
                      </p>
                      <p className="mt-1 text-sm leading-6">
                        Consulte o espelho de ponto para acompanhar a apuração
                        da jornada.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-emerald-50 p-2.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Fingerprint className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {deveRegistrarFacial
                            ? "Confirmação facial obrigatória"
                            : "Assinatura para registro web"}
                        </p>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                          {deveRegistrarFacial
                            ? "Ao continuar, a câmera será aberta para validar sua identidade antes do registro."
                            : "Ao registrar, o SECP gravará a marcação atual como Sistema Web, com assinatura eletrônica e trilha de auditoria."}
                        </p>
                      </div>
                    </div>
                    {deveRegistrarWeb ? (
                      <RegistrarMarcacaoWebAssinaturaModal
                        proximaMarcacao={proximaMarcacao}
                        onRegistrada={destacarMarcacaoRegistrada}
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

            <Card className="p-5 shadow-sm">
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

          <Card className="overflow-hidden shadow-sm">
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
                <MarcacaoDoDiaLinha
                  key={marcacao.id}
                  marcacao={marcacao}
                  index={index}
                  destacada={marcacao.id === marcacaoDestacadaId}
                />
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
            description={`Validação para registrar ${
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
  onRegistrada,
}: {
  proximaMarcacao: string | null;
  onRegistrada: (marcacaoId: string) => void;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState(
    registrarMarcacaoWebAutorizadaAction,
    { erro: null, sucesso: null, marcacaoId: null },
  );
  const rotuloMarcacao = proximaMarcacao?.toLowerCase() ?? "o horário atual";

  useEffect(() => {
    if (!estado.marcacaoId) return;

    const timer = window.setTimeout(() => {
      setAberto(false);
      onRegistrada(estado.marcacaoId!);
      router.refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [estado.marcacaoId, onRegistrada, router]);

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
        title="Assinatura para registrar marcação"
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
          A marcação será gravada com data e hora atuais, origem Sistema Web e
          assinatura eletrônica do usuário logado.
        </div>
      </Modal>
    </>
  );
}

function MarcacaoDoDiaLinha({
  marcacao,
  index,
  destacada,
}: {
  marcacao: RegistroPontoPageProps["marcacoes"][number];
  index: number;
  destacada: boolean;
}) {
  return (
    <div
      className={`flex flex-col justify-between gap-3 p-4 transition-all duration-700 sm:flex-row sm:items-center sm:px-5 ${
        destacada
          ? "bg-blue-50 ring-2 ring-inset ring-blue-300 dark:bg-blue-950/45 dark:ring-blue-700"
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
            destacada
              ? "animate-pulse bg-blue-900 text-white"
              : "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-300"
          }`}
        >
          {index + 1}
        </span>
        <div>
          <p className="font-semibold">
            {obterRotuloTipoMarcacao(marcacao.tipo)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{formatarHora(marcacao.dataHora, marcacao.fusoHorario)}</span>
            <OrigemMarcacaoIcon origem={marcacao.fonte} />
            {destacada ? (
              <span className="inline-flex animate-pulse items-center rounded-full border border-blue-300 bg-white px-2.5 py-1 text-xs font-black text-blue-900 shadow-sm dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">
                Sistema Web
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <Badge variant={marcacao.status === "VALIDA" ? "regular" : "pendente"}>
        {marcacao.status}
      </Badge>
    </div>
  );
}

function RelogioAgora() {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const hora = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(agora),
    [agora],
  );

  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-4 text-right shadow-inner">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
        Hora atual
      </p>
      <p className="mt-2 font-mono text-3xl font-black tracking-normal">
        {hora}
      </p>
    </div>
  );
}

function StatusResumo({
  icon: Icon,
  label,
  valor,
}: {
  icon: LucideIcon;
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-3">
      <div className="flex items-center gap-2 text-cyan-100">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-white">{valor}</p>
    </div>
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
