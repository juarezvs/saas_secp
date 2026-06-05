import { Button, Card, Label, Select } from "@/components/ui";
import { mesesEspelho, statusEspelho, tiposEspelho } from "../data/espelho-banco-horas.mock";

type EspelhoFiltrosProps = {
  mes: string;
  status: string;
  tipo: string;
  onChange: (filtros: Partial<{ mes: string; status: string; tipo: string }>) => void;
};

export function EspelhoFiltros({ mes, status, tipo, onChange }: EspelhoFiltrosProps) {
  return (
    <Card className="p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="mes">Mês</Label>
          <Select id="mes" value={mes} onChange={(event) => onChange({ mes: event.target.value })}>
            {mesesEspelho.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={status} onChange={(event) => onChange({ status: event.target.value })}>
            {statusEspelho.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" value={tipo} onChange={(event) => onChange({ tipo: event.target.value })}>
            {tiposEspelho.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <Button variant="outline" onClick={() => onChange({ mes: "Junho/2026", status: "Todos", tipo: "Todos" })}>
          Limpar filtros
        </Button>
      </div>
    </Card>
  );
}

