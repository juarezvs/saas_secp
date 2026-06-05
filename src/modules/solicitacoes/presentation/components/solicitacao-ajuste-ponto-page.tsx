"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Button, Card, Stepper } from "@/components/ui";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { AnexoComprovanteMock } from "./anexo-comprovante-mock";
import { ComprovanteSolicitacao } from "./comprovante-solicitacao";
import { FormularioJustificativa } from "./formulario-justificativa";
import { RevisaoSolicitacao } from "./revisao-solicitacao";
import { SeletorDataMarcacao } from "./seletor-data-marcacao";
import {
  etapasSolicitacaoAjuste,
  solicitacaoInicial,
  type SolicitacaoAjustePonto,
} from "../data/solicitacao-ajuste-ponto.mock";

type ErrosSolicitacao = Partial<Record<keyof SolicitacaoAjustePonto, string>>;

export function SolicitacaoAjustePontoPage() {
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [dados, setDados] = useState<SolicitacaoAjustePonto>(solicitacaoInicial);
  const [erros, setErros] = useState<ErrosSolicitacao>({});

  const comprovante = etapaAtual === 5;

  function atualizarDados(valor: Partial<SolicitacaoAjustePonto>) {
    setDados((atual) => ({ ...atual, ...valor }));
    setErros((atual) => {
      const copia = { ...atual };
      Object.keys(valor).forEach((campo) => delete copia[campo as keyof SolicitacaoAjustePonto]);
      return copia;
    });
  }

  function validarEtapa() {
    const proximosErros: ErrosSolicitacao = {};

    if (etapaAtual === 0 && !dados.dataMarcacao) {
      proximosErros.dataMarcacao = "Informe a data da ocorrência.";
    }

    if (etapaAtual === 1) {
      if (!dados.tipoMarcacao) proximosErros.tipoMarcacao = "Selecione a marcação.";
      if (!dados.horarioSolicitado) proximosErros.horarioSolicitado = "Informe o horário.";
    }

    if (etapaAtual === 2 && dados.justificativa.trim().length < 12) {
      proximosErros.justificativa = "Explique o ocorrido com pelo menos 12 caracteres.";
    }

    setErros(proximosErros);
    return Object.keys(proximosErros).length === 0;
  }

  function avancar() {
    if (!validarEtapa()) return;
    setEtapaAtual((atual) => Math.min(atual + 1, etapasSolicitacaoAjuste.length - 1));
  }

  function voltar() {
    setEtapaAtual((atual) => Math.max(atual - 1, 0));
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Solicitações", href: "/solicitacoes" }, { label: "Nova solicitação" }]} />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-secp-blue-700">Solicitações com stepper</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Ajuste de ponto</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Preencha uma etapa por vez. A solicitação será encaminhada visualmente para a chefia imediata.
          </p>
        </div>
        <RegraPortariaCard
          artigo="Art. 18, inciso IV"
          titulo="Correção de falha na marcação"
          descricao="O servidor pode solicitar ajuste quando a marcação eletrônica não tiver sido capturada corretamente."
        />
      </section>

      <Stepper steps={etapasSolicitacaoAjuste} currentStep={etapaAtual} />

      <Card className="p-4 text-sm leading-6 text-muted-foreground">
        <strong className="text-foreground">Orientação normativa:</strong> informe data, marcação e justificativa de forma objetiva.
        A chefia imediata analisará o pedido antes da homologação mensal.
      </Card>

      {etapaAtual <= 1 && <SeletorDataMarcacao value={dados} onChange={atualizarDados} erros={erros} />}
      {etapaAtual === 2 && <FormularioJustificativa value={dados.justificativa} erro={erros.justificativa} onChange={(justificativa) => atualizarDados({ justificativa })} />}
      {etapaAtual === 3 && <AnexoComprovanteMock value={dados.anexoNome} onChange={(anexoNome) => atualizarDados({ anexoNome })} />}
      {etapaAtual === 4 && <RevisaoSolicitacao dados={dados} />}
      {comprovante && <ComprovanteSolicitacao />}

      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <Button variant="outline" onClick={voltar} disabled={etapaAtual === 0} leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}>
          Voltar
        </Button>

        {!comprovante ? (
          <Button onClick={avancar} rightIcon={etapaAtual === 4 ? <Send className="size-4" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}>
            {etapaAtual === 4 ? "Enviar solicitação" : "Avançar"}
          </Button>
        ) : (
          <Button variant="success" onClick={() => setEtapaAtual(0)}>
            Nova solicitação
          </Button>
        )}
      </div>
    </div>
  );
}

