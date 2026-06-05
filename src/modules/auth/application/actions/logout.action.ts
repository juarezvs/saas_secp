"use server";

import { cookies } from "next/headers";

import { signOut } from "@/auth";
import { PERFIL_ATIVO_COOKIE } from "@/modules/auth/domain/constants/perfil-ativo-cookie";

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(PERFIL_ATIVO_COOKIE);

  await signOut({
    redirectTo: "/login",
  });
}
