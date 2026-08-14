import { redirect } from "next/navigation";

export default function EstagiariosPage() {
  redirect("/servidores?tipoUsuario=ESTAGIARIO");
}
