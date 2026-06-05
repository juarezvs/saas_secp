import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";

export type PdfTableColumn<TData> = {
  key: string;
  header: string;
  width: string;
  align?: "left" | "center" | "right";
  render: (row: TData) => string | number | null | undefined;
};

type PdfTableProps<TData> = {
  columns: PdfTableColumn<TData>[];
  data: TData[];
  getRowKey: (row: TData, index: number) => string;
};

export function PdfTable<TData>({
  columns,
  data,
  getRowKey,
}: PdfTableProps<TData>) {
  return React.createElement(
    View,
    { style: tableStyles.table },
    React.createElement(
      View,
      { style: [tableStyles.row, tableStyles.header] },
      ...columns.map((column) =>
        React.createElement(
          Text,
          {
            key: column.key,
            style: montarEstiloCelula(column),
          },
          column.header,
        ),
      ),
    ),
    ...data.map((row, index) =>
      React.createElement(
        View,
        { key: getRowKey(row, index), style: tableStyles.row },
        ...columns.map((column) =>
          React.createElement(
            Text,
            {
              key: column.key,
              style: montarEstiloCelula(column),
            },
            formatarValorCelula(column.render(row)),
          ),
        ),
      ),
    ),
  );
}

function formatarValorCelula(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined || valor === "") {
    return "-";
  }

  return String(valor);
}

function montarEstiloCelula<TData>(column: PdfTableColumn<TData>) {
  return {
    padding: 5,
    width: column.width,
    ...(column.align ? { textAlign: column.align } : {}),
  };
}

export const tableStyles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    minHeight: 22,
  },
  header: {
    backgroundColor: "#f3f4f6",
    fontWeight: 700,
  },
});
