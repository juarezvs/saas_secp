"use client";

import { useActionState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { gerarLoteFolhaHorasExtrasAction } from "../../application/actions/gerar-lote-folha-horas-extras.action";
import type { GerarLoteFolhaHorasExtrasFormState } from "../../application/schemas/horas-extras-lote-folha.schema";

type OrgaoOption = {
  id: string;
  sigla: string;
  nome: string;
};

const estadoInicial: GerarLoteFolhaHorasExtrasFormState = {
  sucesso: false,
};

function competenciaAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function erro(estado: GerarLoteFolhaHorasExtrasFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function HorasExtrasGerarLoteForm({ orgaos }: { orgaos: OrgaoOption[] }) {
  const [estado, formAction, pendente] = useActionState(
    gerarLoteFolhaHorasExtrasAction,
    estadoInicial,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerar lote</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {estado.mensagem && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              {estado.mensagem}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
            <div className="space-y-2">
              <Label htmlFor="orgaoId">Órgão</Label>
              <Select
                id="orgaoId"
                name="orgaoId"
                defaultValue={estado.campos?.orgaoId ?? orgaos[0]?.id}
              >
                {orgaos.map((orgao) => (
                  <option key={orgao.id} value={orgao.id}>
                    {orgao.sigla} - {orgao.nome}
                  </option>
                ))}
              </Select>
              {erro(estado, "orgaoId") && (
                <p className="text-xs text-red-700">{erro(estado, "orgaoId")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="competence">Competência</Label>
              <Input
                id="competence"
                name="competence"
                type="month"
                defaultValue={estado.campos?.competence ?? competenciaAtual()}
              />
              {erro(estado, "competence") && (
                <p className="text-xs text-red-700">
                  {erro(estado, "competence")}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" loading={pendente} disabled={orgaos.length === 0}>
            Gerar lote de folha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
