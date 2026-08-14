import { redirect } from "next/navigation";

export default function PrestadoresPage() {
  redirect("/servidores?tipoUsuario=PRESTADOR");
}
