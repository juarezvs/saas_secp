"use client";

import type { ServidorHomologacaoMock } from "../data/homologacao-chefia.mock";
import { ServidorHomologacaoCard } from "./servidor-homologacao-card";

type HomologacaoQueueProps = {
  servidores: ServidorHomologacaoMock[];
  selecionadoId: string;
  onSelecionar: (servidor: ServidorHomologacaoMock) => void;
};

const prioridade = { critico: 0, pendente: 1, regular: 2, homologado: 3 };

export function HomologacaoQueue({ servidores, selecionadoId, onSelecionar }: HomologacaoQueueProps) {
  const ordenados = [...servidores].sort((a, b) => prioridade[a.status] - prioridade[b.status]);

  return (
    <section className="space-y-3" aria-label="Fila de homologação">
      {ordenados.map((servidor) => (
        <ServidorHomologacaoCard
          key={servidor.id}
          servidor={servidor}
          selecionado={servidor.id === selecionadoId}
          onSelecionar={() => onSelecionar(servidor)}
        />
      ))}
    </section>
  );
}

