import { CheckCircle2, FileCheck2, ShieldAlert, ShieldCheck } from "lucide-react";

import {
  type AssinaturaDocumentoAutenticacao,
  buscarDocumentoAutenticacaoPublico,
} from "@/modules/documentos-autenticacao/application/services/documento-autenticacao.service";

type PageProps = {
  params: Promise<{
    codigo: string;
  }>;
  searchParams?: Promise<{
    crc?: string;
  }>;
};

export default async function AutenticidadeDocumentoPage({
  params,
  searchParams,
}: PageProps) {
  const { codigo } = await params;
  const filtros = await searchParams;
  const documento = await buscarDocumentoAutenticacaoPublico(codigo);
  const crcInformado = filtros?.crc?.trim().toUpperCase();
  const crcValido = Boolean(
    documento && (!crcInformado || crcInformado === documento.crc),
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-md bg-blue-950 text-white">
            <FileCheck2 className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase text-blue-900">SECP</p>
            <h1 className="text-3xl font-black tracking-normal">
              Verificação de autenticidade
            </h1>
          </div>
        </div>

        {!documento ? (
          <PainelStatus
            valido={false}
            titulo="Documento não encontrado"
            descricao="Não existe documento registrado no SECP com o código informado."
          />
        ) : (
          <>
            <PainelStatus
              valido={crcValido}
              titulo={
                crcValido
                  ? "Documento registrado no SECP"
                  : "CRC informado não confere"
              }
              descricao={
                crcValido
                  ? "O código verificador e o CRC correspondem a um registro de autenticidade armazenado no SECP."
                  : "O código existe, mas o CRC informado no link não corresponde ao registro oficial."
              }
            />

            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Campo label="Tipo de documento" valor={documento.titulo} />
                <Campo label="Competencia" valor={documento.competencia ?? "-"} />
                <Campo label="Código verificador" valor={documento.codigo} />
                <Campo label="CRC" valor={documento.crc} />
                <Campo
                  label="Servidor"
                  valor={
                    documento.servidorMatricula
                      ? `${documento.servidorMatricula} - ${
                          documento.servidorNome ?? "-"
                        }`
                      : documento.servidorNome ?? "-"
                  }
                />
                <Campo label="Unidade" valor={documento.unidade ?? "-"} />
                <Campo label="Orgao" valor={documento.orgao ?? "-"} />
                <Campo
                  label="Gerado em"
                  valor={formatarDataHora(documento.criadoEm)}
                />
              </dl>

              <div className="mt-5 rounded-md bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Hash do documento
                </p>
                <p className="mt-1 break-all font-mono text-sm text-slate-800">
                  {documento.hashDocumento}
                </p>
              </div>
            </div>

            <AssinaturasDocumento assinaturas={extrairAssinaturas(documento.assinaturas)} />
          </>
        )}
      </section>
    </main>
  );
}

function PainelStatus({
  valido,
  titulo,
  descricao,
}: {
  valido: boolean;
  titulo: string;
  descricao: string;
}) {
  const Icone = valido ? ShieldCheck : ShieldAlert;

  return (
    <div
      className={`rounded-lg border p-5 shadow-sm ${
        valido
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <div className="flex gap-4">
        <Icone className="mt-1 size-7 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-black tracking-normal">{titulo}</h2>
          <p className="mt-2 text-sm leading-6">{descricao}</p>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{valor}</dd>
    </div>
  );
}

function AssinaturasDocumento({
  assinaturas,
}: {
  assinaturas: AssinaturaDocumentoAutenticacao[];
}) {
  if (assinaturas.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        Nenhuma assinatura eletrônica registrada para este documento.
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black tracking-normal">Assinaturas</h2>
      <div className="mt-4 space-y-3">
        {assinaturas.map((assinatura, indice) => (
          <div
            key={`${assinatura.tipo}-${assinatura.nome}-${indice}`}
            className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4"
          >
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-bold text-slate-950">
                {assinatura.nome}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {assinatura.funcao ?? "Função não informada"}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase text-slate-500">
                {assinatura.tipo} em {formatarDataHora(assinatura.data)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function extrairAssinaturas(valor: unknown): AssinaturaDocumentoAutenticacao[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const assinatura = item as Record<string, unknown>;

    if (
      typeof assinatura.nome !== "string" ||
      typeof assinatura.data !== "string" ||
      typeof assinatura.tipo !== "string"
    ) {
      return [];
    }

    return [
      {
        nome: assinatura.nome,
        funcao:
          typeof assinatura.funcao === "string" ? assinatura.funcao : null,
        data: assinatura.data,
        tipo: assinatura.tipo,
      },
    ];
  });
}

function formatarDataHora(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}
