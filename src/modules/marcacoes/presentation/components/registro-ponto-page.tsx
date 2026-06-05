"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Clock, ShieldCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Badge, Button, Card } from "@/components/ui";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { BiometriaVisualMock } from "./biometria-visual-mock";
import { ComprovanteRegistroCard } from "./comprovante-registro-card";
import { ConfirmarRegistroModal } from "./confirmar-registro-modal";
import { ProximaMarcacaoCard } from "./proxima-marcacao-card";
import {
  comprovanteMock,
  fluxoRegistroPonto,
  registroPontoMock,
  type EstadoRegistroPonto,
} from "../data/registro-ponto.mock";

export function RegistroPontoPage() {
  const [estado, setEstado] = useState<EstadoRegistroPonto>("primeira-marcacao");
  const [modalAberto, setModalAberto] = useState(false);
  const [biometriaStatus, setBiometriaStatus] = useState<"aguardando" | "detectado" | "validado">("aguardando");

  const etapaAtual = useMemo(
    () => fluxoRegistroPonto.find((item) => item.estado === estado) ?? fluxoRegistroPonto[0],
    [estado],
  );
  const marcacoes = registroPontoMock.marcacoesPorEstado[estado];
  const comprovanteVisivel = estado === "registrado";

  function iniciarBiometria() {
    setBiometriaStatus("detectado");
    setModalAberto(true);
  }

  function confirmarRegistro() {
    setModalAberto(false);
    setBiometriaStatus("validado");
    setEstado("registrado");
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Marcações", href: "/marcacoes" }, { label: "Registrar" }]} />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Badge className="bg-secp-blue-900 text-white">Registro de ponto</Badge>
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">Registrar horário</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Siga a orientação da próxima marcação. Esta tela está em modo mock para futura integração biométrica.
          </p>
        </div>
        <RegraPortariaCard
          artigo="Art. 6º"
          titulo="Registro eletrônico de frequência"
          descricao="O registro eletrônico deve identificar o servidor e preservar a rastreabilidade da marcação."
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <ProximaMarcacaoCard
          proximaMarcacao={etapaAtual.proxima}
          exigeBiometria={etapaAtual.exigeBiometria}
          onIniciarBiometria={iniciarBiometria}
          onRegistrarHorario={() => setModalAberto(true)}
        />
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Servidor</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoLinha label="Nome" valor={registroPontoMock.servidor.nome} />
            <InfoLinha label="Matrícula" valor={registroPontoMock.servidor.matricula} />
            <InfoLinha label="Unidade" valor={registroPontoMock.servidor.unidade} />
            <InfoLinha label="Jornada prevista" valor={registroPontoMock.servidor.jornada} />
          </dl>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <BiometriaVisualMock status={biometriaStatus} />
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Marcações do dia</h2>
            <Badge variant={marcacoes.length === 0 ? "pendente" : "regular"}>{etapaAtual.label}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {marcacoes.length === 0 ? (
              <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Nenhuma marcação registrada hoje.</p>
            ) : (
              marcacoes.map((marcacao) => (
                <div key={`${marcacao.rotulo}-${marcacao.horario}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                  <div>
                    <p className="font-semibold">{marcacao.rotulo}</p>
                    <p className="text-sm text-muted-foreground">{marcacao.metodo}</p>
                  </div>
                  <span className="font-mono text-sm font-bold">{marcacao.horario}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {comprovanteVisivel && <ComprovanteRegistroCard {...comprovanteMock} />}

      <section className="grid gap-4 md:grid-cols-3">
        <Orientacao icon={ShieldCheck} titulo="Finalidade" texto="A biometria visual confirma identidade antes da primeira marcação." />
        <Orientacao icon={Clock} titulo="Próxima etapa" texto="Depois da entrada, as demais marcações usam registro de horário mockado." />
        <Orientacao icon={CalendarClock} titulo="Comprovante" texto="Após confirmar, o sistema exibe um comprovante visual preparado para integração." />
      </section>

      <div className="flex flex-wrap gap-2">
        {fluxoRegistroPonto.map((item) => (
          <Button key={item.estado} variant={item.estado === estado ? "primary" : "outline"} size="sm" onClick={() => setEstado(item.estado)}>
            {item.label}
          </Button>
        ))}
      </div>

      <ConfirmarRegistroModal
        open={modalAberto}
        proximaMarcacao={etapaAtual.proxima}
        exigeBiometria={etapaAtual.exigeBiometria}
        onOpenChange={setModalAberto}
        onConfirmar={confirmarRegistro}
      />
    </div>
  );
}

function InfoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{valor}</dd>
    </div>
  );
}

function Orientacao({
  icon: Icon,
  titulo,
  texto,
}: {
  icon: typeof ShieldCheck;
  titulo: string;
  texto: string;
}) {
  return (
    <Card className="p-4">
      <Icon className="size-5 text-secp-blue-700" aria-hidden="true" />
      <h3 className="mt-3 font-semibold">{titulo}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{texto}</p>
    </Card>
  );
}

