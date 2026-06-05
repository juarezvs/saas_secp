import React from "react";
import { Document, Page, StyleSheet, Text } from "@react-pdf/renderer";
import {
  PdfTable,
  type PdfTableColumn,
} from "@/shared/reporting/pdf-table";

export type PdfListagemDocumentProps<TData> = {
  title: string;
  subtitle?: string;
  data: TData[];
  columns: PdfTableColumn<TData>[];
  getRowKey: (row: TData, index: number) => string;
  orientation?: "portrait" | "landscape";
};

export function PdfListagemDocument<TData>({
  title,
  subtitle,
  data,
  columns,
  getRowKey,
  orientation = "landscape",
}: PdfListagemDocumentProps<TData>) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      {
        size: "A4",
        orientation,
        style: documentStyles.page,
      },
      React.createElement(Text, { style: documentStyles.title }, title),
      React.createElement(
        Text,
        { style: documentStyles.subtitle },
        subtitle ?? `Total de registros: ${data.length}`,
      ),
      React.createElement(PdfTable<TData>, {
        columns,
        data,
        getRowKey,
      }),
    ),
  );
}

export const documentStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#4b5563",
    marginBottom: 14,
  },
});
