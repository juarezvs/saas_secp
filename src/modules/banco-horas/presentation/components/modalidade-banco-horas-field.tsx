"use client";

import { useState } from "react";

const modalidades = [
  {
    value: "GERAR_CREDITO",
    label: "Gerar credito previamente autorizado",
    descricao:
      "Use quando a chefia autorizar previamente trabalho além da jornada para gerar crédito no banco de horas.",
  },
  {
    value: "UTILIZAR_SALDO",
    label: "Utilizar saldo disponivel",
    descricao:
      "Use para pedir folga, saída antecipada ou ausência compensada usando saldo positivo já existente.",
  },
  {
    value: "COMPENSAR_DEBITO",
    label: "Compensar debito pendente",
    descricao:
      "Use quando houver débito no espelho e você precisa solicitar a compensação desse débito com trabalho ou saldo autorizado.",
  },
];

export function ModalidadeBancoHorasField() {
  const [modalidade, setModalidade] = useState(modalidades[0].value);
  const selecionada =
    modalidades.find((item) => item.value === modalidade) ?? modalidades[0];

  return (
    <label className="block text-sm font-semibold">
      Modalidade
      <select
        name="modalidade"
        required
        className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
        value={modalidade}
        onChange={(event) => setModalidade(event.target.value)}
      >
        {modalidades.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <span className="mt-2 block rounded-md border bg-[var(--muted)]/40 px-3 py-2 text-xs leading-5 text-[var(--muted-foreground)]">
        {selecionada.descricao}
      </span>
    </label>
  );
}
