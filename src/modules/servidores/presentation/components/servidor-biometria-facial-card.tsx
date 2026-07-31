"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  RotateCcw,
  ScanFace,
  ShieldOff,
  UserPlus,
} from "lucide-react";

import { Button, Modal } from "@/components/ui";

const CadastroFacialEnrollmentWizard = dynamic(
  () =>
    import(
      "@/modules/biometria/presentation/components/enrollment/cadastro-facial-enrollment-wizard"
    ).then((mod) => mod.CadastroFacialEnrollmentWizard),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-[var(--muted-foreground)]">
        Carregando módulo de cadastro facial...
      </p>
    ),
  },
);

type StatusCadastroFacial = "PENDENTE" | "ATIVO" | "BLOQUEADO" | "REVOGADO";

type AuditoriaFacialEvento = {
  id: string;
  entidade: string;
  entidadeId: string | null;
  acao: string;
  criadoEm: string;
  usuario: {
    id: string;
    nome: string;
    matricula: string;
  } | null;
};

type ServidorBiometriaFacialCardProps = {
  servidorId: string;
  servidorNome: string;
  resumo: {
    status: StatusCadastroFacial | "NAO_CADASTRADO";
    amostrasQuantidade: number;
    qualidadeMedia: number | null;
    atualizadoEm: string | null;
    revogadoEm: string | null;
    ultimaTentativaEm: string | null;
    ultimaTentativaStatus: string | null;
    ultimoEventoEm: string | null;
    ultimoEventoAcao: string | null;
    ultimoEventoUsuario: string | null;
  };
  permissoes: {
    podeCadastrar: boolean;
    podeRecadastrar: boolean;
    podeInvalidar: boolean;
    podeVerAuditoria: boolean;
  };
};

export function ServidorBiometriaFacialCard({
  servidorId,
  servidorNome,
  resumo,
  permissoes,
}: ServidorBiometriaFacialCardProps) {
  const router = useRouter();
  const [modalCadastro, setModalCadastro] = useState<{
    open: boolean;
    modo: "cadastro" | "recadastro";
    key: number;
  }>({ open: false, modo: "cadastro", key: 0 });
  const [modalAuditoria, setModalAuditoria] = useState(false);
  const [auditoria, setAuditoria] = useState<AuditoriaFacialEvento[]>([]);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
  const [erroAuditoria, setErroAuditoria] = useState<string | null>(null);
  const [invalidando, setInvalidando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const statusVisual = obterStatusVisual(resumo.status);
  const podeMostrarCadastrar =
    permissoes.podeCadastrar && resumo.status !== "ATIVO";
  const podeMostrarRecadastrar =
    permissoes.podeRecadastrar && resumo.status !== "NAO_CADASTRADO";
  const podeMostrarInvalidar =
    permissoes.podeInvalidar && resumo.status === "ATIVO";
  const requestExtra = useMemo(() => ({ servidorId }), [servidorId]);

  function abrirCadastro(modo: "cadastro" | "recadastro") {
    setErroAcao(null);
    setModalCadastro((atual) => ({
      open: true,
      modo,
      key: atual.key + 1,
    }));
  }

  async function invalidarCadastro() {
    if (
      !window.confirm(
        "Deseja invalidar o cadastro facial deste servidor? Essa ação impedirá o uso da biometria facial até novo cadastro.",
      )
    ) {
      return;
    }

    setInvalidando(true);
    setErroAcao(null);

    try {
      const response = await fetch("/api/biometria/facial/admin/invalidar", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          servidorId,
          motivo: "Invalidação administrativa pelo cadastro do servidor.",
        }),
      });
      const payload = (await response.json()) as
        | { success: true }
        | { success: false; message: string };

      if (!payload.success) {
        throw new Error(payload.message);
      }

      router.refresh();
    } catch (error) {
      setErroAcao(
        error instanceof Error
          ? error.message
          : "Não foi possível invalidar o cadastro facial.",
      );
    } finally {
      setInvalidando(false);
    }
  }

  async function abrirAuditoria() {
    setModalAuditoria(true);
    setCarregandoAuditoria(true);
    setErroAuditoria(null);

    try {
      const response = await fetch(
        `/api/biometria/facial/admin/auditoria?servidorId=${encodeURIComponent(
          servidorId,
        )}&limite=30`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as
        | { success: true; data: AuditoriaFacialEvento[] }
        | { success: false; message: string };

      if (!payload.success) {
        throw new Error(payload.message);
      }

      setAuditoria(payload.data);
    } catch (error) {
      setErroAuditoria(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar a auditoria facial.",
      );
    } finally {
      setCarregandoAuditoria(false);
    }
  }

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-start">
        <div className="flex items-center gap-2">
          <ScanFace className="size-5 text-blue-900 dark:text-blue-300" />
          <div>
            <h2 className="text-lg font-bold">Biometria facial</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Cadastro, validação administrativa e auditoria facial do servidor.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusVisual.className}`}
        >
          {statusVisual.icon}
          {statusVisual.label}
        </span>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-4">
        <InfoItem label="Status" value={statusVisual.label} />
        <InfoItem
          label="Amostras"
          value={String(resumo.amostrasQuantidade)}
        />
        <InfoItem
          label="Qualidade média"
          value={
            typeof resumo.qualidadeMedia === "number"
              ? resumo.qualidadeMedia.toFixed(2)
              : "-"
          }
        />
        <InfoItem
          label="Última tentativa"
          value={formatarDataHora(resumo.ultimaTentativaEm)}
          detail={resumo.ultimaTentativaStatus ?? undefined}
        />
      </div>

      <div className="grid gap-4 border-t p-5 md:grid-cols-2">
        <InfoItem
          label="Última atualização"
          value={formatarDataHora(resumo.atualizadoEm)}
        />
        <InfoItem
          label="Último evento"
          value={resumo.ultimoEventoAcao ?? "-"}
          detail={[
            formatarDataHora(resumo.ultimoEventoEm),
            resumo.ultimoEventoUsuario,
          ]
            .filter(Boolean)
            .join(" - ")}
        />
      </div>

      {erroAcao && (
        <p className="mx-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {erroAcao}
        </p>
      )}

      <div className="flex flex-wrap gap-3 p-5 pt-0">
        {podeMostrarCadastrar && (
          <Button
            type="button"
            size="sm"
            leftIcon={<UserPlus className="size-4" aria-hidden="true" />}
            onClick={() => abrirCadastro("cadastro")}
          >
            Cadastrar face
          </Button>
        )}

        {podeMostrarRecadastrar && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
            onClick={() => abrirCadastro("recadastro")}
          >
            Recadastrar face
          </Button>
        )}

        {podeMostrarInvalidar && (
          <Button
            type="button"
            size="sm"
            variant="danger"
            loading={invalidando}
            leftIcon={<ShieldOff className="size-4" aria-hidden="true" />}
            onClick={() => void invalidarCadastro()}
          >
            Invalidar cadastro facial
          </Button>
        )}

        {permissoes.podeVerAuditoria && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<Eye className="size-4" aria-hidden="true" />}
            onClick={() => void abrirAuditoria()}
          >
            Ver auditoria facial
          </Button>
        )}
      </div>

      <Modal
        open={modalCadastro.open}
        onOpenChange={(open) =>
          setModalCadastro((atual) => ({ ...atual, open }))
        }
        title={
          modalCadastro.modo === "recadastro"
            ? "Recadastrar biometria facial"
            : "Cadastrar biometria facial"
        }
        description={`Servidor: ${servidorNome}`}
        className="max-h-[92vh] w-[min(96vw,1120px)] overflow-y-auto"
      >
        <CadastroFacialEnrollmentWizard
          key={modalCadastro.key}
          modo={modalCadastro.modo}
          endpoints={{
            iniciar: "/api/biometria/facial/admin/enrollment/session",
            concluir: "/api/biometria/facial/admin/enrollment/complete",
          }}
          requestExtra={requestExtra}
          onConcluido={() => {
            router.refresh();
          }}
        />
      </Modal>

      <Modal
        open={modalAuditoria}
        onOpenChange={setModalAuditoria}
        title="Auditoria facial"
        description={`Eventos recentes de biometria facial de ${servidorNome}.`}
        className="max-h-[88vh] w-[min(94vw,880px)] overflow-y-auto"
      >
        {carregandoAuditoria ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Consultando eventos...
          </p>
        ) : erroAuditoria ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {erroAuditoria}
          </p>
        ) : auditoria.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhum evento facial localizado para este servidor.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {auditoria.map((evento) => (
              <div key={evento.id} className="space-y-1 p-4">
                <p className="font-semibold">{evento.acao}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {evento.entidade} - {formatarDataHora(evento.criadoEm)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Responsável:{" "}
                  {evento.usuario
                    ? `${evento.usuario.matricula} - ${evento.usuario.nome}`
                    : "Sistema"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
}

function InfoItem({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
      {detail && (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</p>
      )}
    </div>
  );
}

function obterStatusVisual(status: StatusCadastroFacial | "NAO_CADASTRADO") {
  if (status === "ATIVO") {
    return {
      label: "Ativo",
      className:
        "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
      icon: <CheckCircle2 className="size-4" aria-hidden="true" />,
    };
  }

  if (status === "REVOGADO") {
    return {
      label: "Invalidado",
      className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
      icon: <ShieldOff className="size-4" aria-hidden="true" />,
    };
  }

  if (status === "BLOQUEADO") {
    return {
      label: "Bloqueado",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      icon: <AlertTriangle className="size-4" aria-hidden="true" />,
    };
  }

  if (status === "PENDENTE") {
    return {
      label: "Pendente",
      className:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      icon: <AlertTriangle className="size-4" aria-hidden="true" />,
    };
  }

  return {
    label: "Não cadastrado",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <ScanFace className="size-4" aria-hidden="true" />,
  };
}

function formatarDataHora(valor: string | null) {
  if (!valor) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}
