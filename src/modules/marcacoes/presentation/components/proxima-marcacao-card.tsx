import { Clock, ScanFace } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";

type ProximaMarcacaoCardProps = {
  proximaMarcacao: string;
  exigeBiometria: boolean;
  onIniciarBiometria: () => void;
  onRegistrarHorario: () => void;
};

export function ProximaMarcacaoCard({
  proximaMarcacao,
  exigeBiometria,
  onIniciarBiometria,
  onRegistrarHorario,
}: ProximaMarcacaoCardProps) {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Badge variant={exigeBiometria ? "pendente" : "regular"}>
            {exigeBiometria ? "Biometria exigida" : "Registro liberado"}
          </Badge>
          <h2 className="mt-4 text-2xl font-bold text-foreground">
            Próxima marcação: {proximaMarcacao}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {exigeBiometria
              ? "A primeira marcação do dia exige reconhecimento facial antes do registro."
              : "Confirme o horário para registrar a próxima etapa da jornada."}
          </p>
        </div>

        <div className="shrink-0">
          {exigeBiometria ? (
            <Button onClick={onIniciarBiometria} leftIcon={<ScanFace className="size-4" aria-hidden="true" />}>
              Iniciar reconhecimento facial
            </Button>
          ) : (
            <Button onClick={onRegistrarHorario} leftIcon={<Clock className="size-4" aria-hidden="true" />}>
              Registrar horário
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

