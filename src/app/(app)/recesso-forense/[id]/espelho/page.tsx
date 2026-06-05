import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarRecessoForensePorId,
  buscarServidorPorUsuarioId,
  listarEspelhoRecessoPorServidor,
} from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";
import { EspelhoRecessoReal } from "@/modules/recesso-forense/presentation/components/espelho-recesso-real";

type RecessoEspelhoPageProps = {
  params: Promise<{ id: string }>;
};

function enumerarDias(inicio: Date, fim: Date) {
  const dias: Date[] = [];
  const cursor = new Date(inicio);

  while (cursor <= fim) {
    dias.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dias;
}

export default async function RecessoEspelhoPage({
  params,
}: RecessoEspelhoPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:consultar:proprio",
    "recesso:consultar:global",
    "recesso:fechar:proprio",
    "recesso:gerenciar:global",
  ]);

  const session = await auth();
  const { id } = await params;
  const recesso = await buscarRecessoForensePorId(id);

  if (!recesso || !session?.user) {
    notFound();
  }

  const servidor = await buscarServidorPorUsuarioId(session.user.id);

  if (!servidor) {
    notFound();
  }

  const espelhosPersistidos = await listarEspelhoRecessoPorServidor(
    recesso.id,
    servidor.id,
  );

  const dias = enumerarDias(recesso.dataInicio, recesso.dataFim).map((data) => {
    const persistido = espelhosPersistidos.find(
      (item) =>
        item.dataReferencia.toISOString().slice(0, 10) ===
        data.toISOString().slice(0, 10),
    );

    return (
      persistido ?? {
        id: `virtual-${data.toISOString()}`,
        dataReferencia: data,
        status: "RECESSO_FORENSE",
        escolha: "PENDENTE",
        minutosTrabalhados: 0,
        convocado: null,
      }
    );
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Recesso forense", href: "/recesso-forense" },
          { label: String(recesso.ano), href: `/recesso-forense/${recesso.id}` },
          { label: "Espelho" },
        ]}
      />

      <EspelhoRecessoReal recesso={recesso} servidor={servidor} dias={dias} />
    </div>
  );
}
