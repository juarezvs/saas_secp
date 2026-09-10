"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { FavoritoUsuarioPerfilDto } from "@/modules/favoritos/application/favoritos-usuario-perfil.service";

type FavoritosContextValue = {
  favoritos: FavoritoUsuarioPerfilDto[];
  isFavorito: (itemCatalogo: string) => boolean;
  favoritar: (itemCatalogo: string) => Promise<void>;
  desfavoritar: (itemCatalogo: string) => Promise<void>;
};

const FavoritosContext = createContext<FavoritosContextValue | null>(null);

export function FavoritosProvider({
  favoritosIniciais,
  children,
}: {
  favoritosIniciais: FavoritoUsuarioPerfilDto[];
  children: ReactNode;
}) {
  const [favoritos, setFavoritos] = useState(favoritosIniciais);

  const isFavorito = useCallback(
    (itemCatalogo: string) =>
      favoritos.some((favorito) => favorito.itemCatalogo === itemCatalogo),
    [favoritos],
  );

  const favoritar = useCallback(async (itemCatalogo: string) => {
    const resposta = await fetch("/api/favoritos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ itemCatalogo }),
    });

    if (!resposta.ok) {
      const erro = (await resposta.json().catch(() => null)) as {
        message?: string;
      } | null;

      throw new Error(erro?.message ?? "Nao foi possivel favoritar.");
    }

    const payload = (await resposta.json()) as {
      favorito: FavoritoUsuarioPerfilDto;
    };

    setFavoritos((atuais) => {
      if (
        atuais.some(
          (favorito) =>
            favorito.itemCatalogo === payload.favorito.itemCatalogo,
        )
      ) {
        return atuais;
      }

      return [...atuais, payload.favorito].sort((a, b) => a.ordem - b.ordem);
    });
  }, []);

  const desfavoritar = useCallback(async (itemCatalogo: string) => {
    const resposta = await fetch("/api/favoritos", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ itemCatalogo }),
    });

    if (!resposta.ok) {
      const erro = (await resposta.json().catch(() => null)) as {
        message?: string;
      } | null;

      throw new Error(erro?.message ?? "Nao foi possivel remover favorito.");
    }

    setFavoritos((atuais) =>
      atuais.filter((favorito) => favorito.itemCatalogo !== itemCatalogo),
    );
  }, []);

  const value = useMemo(
    () => ({
      favoritos,
      isFavorito,
      favoritar,
      desfavoritar,
    }),
    [desfavoritar, favoritar, favoritos, isFavorito],
  );

  return (
    <FavoritosContext.Provider value={value}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritosPerfil() {
  const context = useContext(FavoritosContext);

  if (!context) {
    throw new Error("useFavoritosPerfil deve ser usado dentro de FavoritosProvider.");
  }

  return context;
}
