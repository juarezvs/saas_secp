import { redirect } from "next/navigation";

export default function VoluntariosPage() {
  redirect("/servidores?tipoUsuario=VOLUNTARIO");
}
