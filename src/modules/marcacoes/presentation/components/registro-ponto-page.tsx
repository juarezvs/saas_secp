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
  Coffee,
  LogIn,
  LogOut,
  PenLine,
  RotateCcw,
  ScanFace,
  ShieldCheck,
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
    exigeIntervalo: boolean;
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

type EtapaMarcacao = {
  tipo: "ENTRADA" | "SAIDA_INTERVALO" | "RETORNO_INTERVALO" | "SAIDA";
  label: string;
  icon: LucideIcon;
};

const ETAPAS_COM_INTERVALO: EtapaMarcacao[] = [
  { tipo: "ENTRADA", label: "Entrada", icon: LogIn },
  { tipo: "SAIDA_INTERVALO", label: "Saída intervalo", icon: Coffee },
  { tipo: "RETORNO_INTERVALO", label: "Retorno", icon: RotateCcw },
  { tipo: "SAIDA", label: "Saída", icon: LogOut },
];

const ETAPAS_SEM_INTERVALO: EtapaMarcacao[] = [
  { tipo: "ENTRADA", label: "Entrada", icon: LogIn },
  { tipo: "SAIDA", label: "Saída", icon: LogOut },
];

export function RegistroPontoPage({
  servidor,
  marcacoes,
  proximaMarcacao,
  fluxoConcluido,
  podeRegistrarWeb,
  podeRegistrarFacial,
}: RegistroPontoPageProps) {
  const router = useRouter();
  const [reconhecimentoAberto, setReconhecimentoAberto] = useState(false);
  const [marcacaoDestacadaId, setMarcacaoDestacadaId] = useState<string | null>(
    null,
  );
  const deveRegistrarWeb = podeRegistrarWeb;
  const deveRegistrarFacial = !deveRegistrarWeb && podeRegistrarFacial;
  const ultimaMarcacao = marcacoes[marcacoes.length - 1] ?? null;
  const destacarMarcacaoRegistrada = useCallback((marcacaoId: string) => {
    setMarcacaoDestacadaId(marcacaoId);
  }, []);

  useEffect(() => {
    if (!marcacaoDestacadaId) return;

    const timer = window.setTimeout(() => setMarcacaoDestacadaId(null), 6500);

    return () => window.clearTimeout(timer);
  }, [marcacaoDestacadaId]);

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Marcações", href: "/marcacoes" },
          { label: "Registrar horário" },
        ]}
      />

      <PageHeader
        icon={Clock3}
        titulo="Registrar horário"
        descricao="Registre a próxima marcação autorizada pelo SECP."
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
          <Card className="overflow-hidden shadow-sm">
            <div className="border-b bg-card p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-[var(--secp-theme-accent)]">
                    Próxima marcação
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-normal text-foreground md:text-3xl">
                    {fluxoConcluido
                      ? "Jornada registrada"
                      : (proximaMarcacao ?? "Aguardando classificação")}
                  </h2>
                  <p className="mt-2 truncate text-sm text-muted-foreground">
                    {servidor.nome} · {servidor.matricula} · {servidor.unidade}
                  </p>
                </div>
                <RelogioAgora />
              </div>
            </div>

            <div className="p-4 md:p-5">
              <StepperMarcacoes
                exigeIntervalo={servidor.exigeIntervalo}
                marcacoes={marcacoes}
                fluxoConcluido={fluxoConcluido}
              />

              <div className="mt-5 grid gap-4 rounded-md border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                {fluxoConcluido ? (
                  <div className="flex items-start gap-3 text-green-800 dark:text-green-200">
                    <BadgeCheck className="mt-0.5 size-5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">
                        Todas as marcações ordinárias foram registradas.
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Consulte o espelho de ponto para acompanhar a apuração.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-[var(--secp-theme-accent-soft)] p-2 text-[var(--secp-theme-accent)]">
                      {deveRegistrarFacial ? (
                        <ScanFace className="size-5" aria-hidden="true" />
                      ) : (
                        <ShieldCheck className="size-5" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {deveRegistrarFacial
                          ? "Reconhecimento facial"
                          : "Registro via sistema web"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {deveRegistrarFacial
                          ? "Valide sua identidade para registrar o horário atual."
                          : "Assine para gravar o horário atual com trilha de auditoria."}
                      </p>
                    </div>
                  </div>
                )}

                {!fluxoConcluido && deveRegistrarWeb ? (
                  <RegistrarMarcacaoWebAssinaturaModal
                    proximaMarcacao={proximaMarcacao}
                    onRegistrada={destacarMarcacaoRegistrada}
                  />
                ) : null}
                {!fluxoConcluido && deveRegistrarFacial ? (
                  <Button
                    size="lg"
                    onClick={() => setReconhecimentoAberto(true)}
                    leftIcon={<ScanFace className="size-5" aria-hidden="true" />}
                  >
                    Registrar com reconhecimento facial
                  </Button>
                ) : null}
                {!fluxoConcluido && !deveRegistrarWeb && !deveRegistrarFacial ? (
                  <Badge variant="pendente">
                    Registro pelo SECP não autorizado
                  </Badge>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <ContextoRegistro label="Jornada" valor={servidor.jornada} />
                <ContextoRegistro
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
                <ContextoRegistro
                  label="Origem autorizada"
                  valor={
                    deveRegistrarWeb ? "Sistema web" : "Reconhecimento facial"
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
              <div className="flex items-center gap-2">
                <Clock3 className="size-5 text-[var(--secp-theme-accent)]" />
                <h2 className="font-semibold">Marcações de hoje</h2>
              </div>
              <Link
                href="/marcacoes"
                className="text-sm font-semibold text-[var(--secp-theme-accent)] hover:underline"
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
                <div className="p-6 text-center">
                  <Clock3 className="mx-auto size-7 text-muted-foreground" />
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
              <ValidacaoFacialCard
                compact
                onRegistroConcluido={(marcacaoId) => {
                  setReconhecimentoAberto(false);
                  if (marcacaoId) {
                    destacarMarcacaoRegistrada(marcacaoId);
                  }
                  router.refresh();
                }}
              />
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

function StepperMarcacoes({
  exigeIntervalo,
  marcacoes,
  fluxoConcluido,
}: {
  exigeIntervalo: boolean;
  marcacoes: RegistroPontoPageProps["marcacoes"];
  fluxoConcluido: boolean;
}) {
  const etapas = exigeIntervalo ? ETAPAS_COM_INTERVALO : ETAPAS_SEM_INTERVALO;
  const primeiraPendente = etapas.findIndex(
    (etapa) => !marcacoes.some((marcacao) => marcacao.tipo === etapa.tipo),
  );

  return (
    <ol className="grid gap-2 sm:grid-cols-[repeat(var(--steps),minmax(0,1fr))]" style={{ "--steps": etapas.length } as React.CSSProperties}>
      {etapas.map((etapa, index) => {
        const marcacao = marcacoes.find((item) => item.tipo === etapa.tipo);
        const concluida = Boolean(marcacao);
        const atual = !fluxoConcluido && index === primeiraPendente;
        const Icon = etapa.icon;

        return (
          <li key={etapa.tipo} className="relative flex items-center gap-3 sm:block">
            {index > 0 ? (
              <span
                className={`hidden sm:absolute sm:left-[-50%] sm:right-[50%] sm:top-5 sm:block sm:h-px ${
                  concluida ? "bg-[var(--secp-theme-accent)]" : "bg-border"
                }`}
                aria-hidden="true"
              />
            ) : null}
            <div className="relative z-10 flex sm:flex-col sm:items-center">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full border text-sm transition ${
                  concluida
                    ? "border-[var(--secp-theme-accent)] bg-[var(--secp-theme-accent)] text-[var(--secp-theme-accent-contrast)]"
                    : atual
                      ? "border-[var(--secp-theme-accent)] bg-[var(--secp-theme-accent-soft)] text-[var(--secp-theme-accent)] ring-2 ring-[var(--secp-theme-accent-soft)]"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="ml-3 min-w-0 sm:ml-0 sm:mt-2 sm:text-center">
                <p className="truncate text-sm font-semibold">{etapa.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {marcacao
                    ? formatarHora(marcacao.dataHora, marcacao.fusoHorario)
                    : atual
                      ? "Agora"
                      : "Pendente"}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
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
      className={`flex flex-col justify-between gap-3 px-4 py-3 transition-all duration-700 sm:flex-row sm:items-center sm:px-5 ${
        destacada
          ? "bg-[var(--secp-theme-accent-soft)] ring-2 ring-inset ring-[var(--secp-theme-accent)]"
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
            destacada
              ? "animate-pulse bg-[var(--secp-theme-accent)] text-[var(--secp-theme-accent-contrast)]"
              : "bg-[var(--secp-theme-accent-soft)] text-[var(--secp-theme-accent)]"
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
              <span className="inline-flex animate-pulse items-center rounded-full border border-[var(--secp-theme-accent)] bg-card px-2.5 py-1 text-xs font-black text-[var(--secp-theme-accent)] shadow-sm">
                Registrada agora
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
    <div className="rounded-md border bg-muted/20 px-3 py-2 text-right">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Hora atual
      </p>
      <p className="mt-1 font-mono text-xl font-bold tracking-normal text-foreground">
        {hora}
      </p>
    </div>
  );
}

function ContextoRegistro({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-card px-3 py-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold text-foreground">{valor}</p>
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
