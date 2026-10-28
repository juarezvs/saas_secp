import Link from "next/link";
import { ServerCog } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function InstalacaoAgentePage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:gerenciar:global",
    "integracoes:gerenciar:seccional",
  ]);
  return (
    <div className="space-y-5">
      <PageHeader
        icon={ServerCog}
        titulo="Instalação dos agentes de descoberta"
        variant="blade"
        descricao="Agentes fazem conexões de saída e executam somente operações tipadas nas redes autorizadas."
      />
      <Link
        href="/equipamentos/descoberta?tab=agents"
        className="text-sm text-blue-800 underline dark:text-blue-300"
      >
        Voltar aos agentes
      </Link>
      <section className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <h2 className="font-semibold">Primeira instalação</h2>
        <ol className="list-inside list-decimal space-y-2">
          <li>Autorize uma rede e registre o agente na tela de descoberta.</li>
          <li>
            Baixe a configuração no detalhe do agente. Preencha o endereço HTTPS
            público do serviço central e confira as redes permitidas.
          </li>
          <li>
            Disponibilize Python 3.12+ e instale o pacote da pasta{" "}
            <code>services/device-discovery</code> do repositório.
          </li>
          <li>
            Defina a credencial inicial no ambiente do processo como{" "}
            <code>DISCOVERY_AGENT_BOOTSTRAP_TOKEN</code>. Ela é exibida uma
            única vez e expira em 15 minutos.
          </li>
          <li>
            Inicie o agente, confira seu primeiro heartbeat e aprove a inscrição
            no SECP.
          </li>
        </ol>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
          {
            "python -m pip install ./services/device-discovery\npython -m discovery.agent --config /caminho/agent.json"
          }
        </pre>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <h2 className="font-semibold">Linux e Docker</h2>
        <p>
          Há um instalador Linux, um arquivo systemd e um Compose do agente
          nessa pasta. No Linux, rede host permite descoberta multicast e
          leitura da vizinhança da interface física. O agente não precisa de
          portas públicas de entrada.
        </p>
        <p>
          Em Docker Desktop no Windows, o contêiner não representa
          automaticamente a LAN física. Para ARP/multicast, prefira a execução
          nativa sob uma conta dedicada ou um agente Linux na seccional.
        </p>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <h2 className="font-semibold">Windows e credenciais</h2>
        <p>
          Execute sob uma conta de serviço dedicada, pelo Agendador de Tarefas
          ou wrapper de serviço aprovado pela equipe de infraestrutura.
          Restrinja o diretório de estado e de configuração à conta do serviço.
          O agente armazena sua credencial operacional com DPAPI, vinculada à
          conta Windows.
        </p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
          {
            "python -m discovery.agent --config C:\\SECP\\agent.json --protect-config"
          }
        </pre>
        <p>
          Perfis de autenticação de equipamentos são opcionais e ficam somente
          no agente, em arquivo protegido. Sem eles, a identificação usa apenas
          informações públicas e pode permanecer provável/desconhecida.
        </p>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <h2 className="font-semibold">Diagnóstico e ciclo de vida</h2>
        <p>
          Confira conectividade HTTPS, certificado da autoridade interna,
          horário do sistema e a interseção entre redes locais e redes aprovadas
          no SECP. Heartbeats ausentes tornam o agente offline. Leases expirados
          devolvem jobs à fila, com limite de tentativas e prazo final.
        </p>
        <p>
          Rotação automática preserva cinco minutos de transição entre
          credenciais. Reinscrição administrativa exige novo bootstrap e nova
          aprovação. Revogação bloqueia o acesso imediatamente; não executa
          comandos remotos nem atualiza código.
        </p>
        <p>
          Para atualizar, pare o serviço, instale a versão aprovada e reinicie
          preservando o diretório de estado. Para remover, pare/desabilite o
          serviço e revogue o agente; preserve o estado conforme a política de
          retenção.
        </p>
      </section>
    </div>
  );
}
