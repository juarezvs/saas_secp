import {
  formatarDataHoraAuditoria,
  rotuloEntidadeAuditoria,
} from "../../application/services/formatar-auditoria.service";

const LIMITE_PREVIA_JSON_AUDITORIA = 30000;

type AuditoriaDetalheCardProps = {
  evento: {
    id: string;
    usuarioId: string | null;
    entidade: string;
    entidadeId: string | null;
    acao: string;
    dadosAntesTexto: string | null;
    dadosAntesCaracteres: number | null;
    dadosAntesBytes: number | null;
    dadosDepoisTexto: string | null;
    dadosDepoisCaracteres: number | null;
    dadosDepoisBytes: number | null;
    metadadosTexto: string | null;
    metadadosCaracteres: number | null;
    metadadosBytes: number | null;
    ip: string | null;
    userAgent: string | null;
    criadoEm: Date;
    usuario: {
      nome: string;
      matricula: string;
      email: string | null;
    } | null;
  };
};

export function AuditoriaDetalheCard({ evento }: AuditoriaDetalheCardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Resumo do evento</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info
            label="Data/hora"
            value={formatarDataHoraAuditoria(evento.criadoEm)}
          />
          <Info
            label="Entidade"
            value={rotuloEntidadeAuditoria(evento.entidade)}
          />
          <Info label="Ação" value={evento.acao} />
          <Info label="IP" value={evento.ip ?? "-"} />
          <Info label="ID evento" value={evento.id} />
          <Info label="ID entidade" value={evento.entidadeId ?? "-"} />
          <Info
            label="Usuário"
            value={
              evento.usuario
                ? `${evento.usuario.matricula} — ${evento.usuario.nome}`
                : "Sistema/sem usuário"
            }
          />
          <Info label="E-mail" value={evento.usuario?.email ?? "-"} />
        </div>

        {evento.userAgent && (
          <div className="mt-5 rounded-lg border bg-[var(--muted)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
              User-Agent
            </p>
            <p className="mt-2 break-all font-mono text-xs">
              {evento.userAgent}
            </p>
          </div>
        )}
      </section>

      <JsonBlock
        titulo="Dados antes"
        texto={evento.dadosAntesTexto}
        caracteres={evento.dadosAntesCaracteres}
        bytes={evento.dadosAntesBytes}
      />
      <JsonBlock
        titulo="Dados depois"
        texto={evento.dadosDepoisTexto}
        caracteres={evento.dadosDepoisCaracteres}
        bytes={evento.dadosDepoisBytes}
      />
      <JsonBlock
        titulo="Metadados"
        texto={evento.metadadosTexto}
        caracteres={evento.metadadosCaracteres}
        bytes={evento.metadadosBytes}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 break-all font-semibold">{value}</p>
    </div>
  );
}

function JsonBlock({
  titulo,
  texto,
  caracteres,
  bytes,
}: {
  titulo: string;
  texto: string | null;
  caracteres: number | null;
  bytes: number | null;
}) {
  const truncado =
    typeof caracteres === "number" && caracteres > LIMITE_PREVIA_JSON_AUDITORIA;
  const conteudo = texto ? formatarTextoJsonAuditoria(texto, truncado) : "-";

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col gap-2 border-b p-5 md:flex-row md:items-start md:justify-between">
        <h2 className="text-lg font-bold">{titulo}</h2>

        {texto && (
          <div className="text-xs text-[var(--muted-foreground)]">
            {formatarQuantidadeCaracteres(caracteres)}
            {bytes ? ` · ${formatarBytes(bytes)}` : ""}
            {truncado ? " · prévia limitada" : ""}
          </div>
        )}
      </div>

      <pre className="max-h-[520px] overflow-auto p-5 text-xs leading-6">
        {conteudo}
      </pre>

      {truncado && (
        <div className="border-t bg-[var(--muted)] px-5 py-3 text-xs text-[var(--muted-foreground)]">
          Conteúdo muito extenso. A tela exibe os primeiros{" "}
          {LIMITE_PREVIA_JSON_AUDITORIA.toLocaleString("pt-BR")} caracteres
          para manter a abertura do detalhe responsiva.
        </div>
      )}
    </section>
  );
}

function formatarTextoJsonAuditoria(texto: string, truncado: boolean) {
  if (truncado) {
    return texto;
  }

  try {
    return JSON.stringify(JSON.parse(texto), null, 2);
  } catch {
    return texto;
  }
}

function formatarQuantidadeCaracteres(caracteres: number | null) {
  if (!caracteres) {
    return "sem conteúdo";
  }

  return `${caracteres.toLocaleString("pt-BR")} caracteres`;
}

function formatarBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} KB`;
  }

  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} MB`;
}
