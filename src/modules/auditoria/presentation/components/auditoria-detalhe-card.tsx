import {
  formatarDataHoraAuditoria,
  formatarJsonAuditoria,
  rotuloEntidadeAuditoria,
} from "../../application/services/formatar-auditoria.service";

type AuditoriaDetalheCardProps = {
  evento: {
    id: string;
    usuarioId: string | null;
    entidade: string;
    entidadeId: string | null;
    acao: string;
    dadosAntes: unknown;
    dadosDepois: unknown;
    metadados: unknown;
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

      <JsonBlock titulo="Dados antes" valor={evento.dadosAntes} />
      <JsonBlock titulo="Dados depois" valor={evento.dadosDepois} />
      <JsonBlock titulo="Metadados" valor={evento.metadados} />
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

function JsonBlock({ titulo, valor }: { titulo: string; valor: unknown }) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">{titulo}</h2>
      </div>

      <pre className="max-h-[520px] overflow-auto p-5 text-xs leading-6">
        {formatarJsonAuditoria(valor)}
      </pre>
    </section>
  );
}
