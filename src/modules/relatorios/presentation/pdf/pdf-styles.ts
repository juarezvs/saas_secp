import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 12,
    marginBottom: 16,
  },
  orgao: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#374151",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 10,
    color: "#4b5563",
    marginTop: 4,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  row: {
    flexDirection: "row",
  },
  infoBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 6,
    marginRight: 6,
    marginBottom: 6,
    flexGrow: 1,
  },
  label: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    fontWeight: 700,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  th: {
    padding: 5,
    fontSize: 7,
    fontWeight: 700,
  },
  td: {
    padding: 5,
    fontSize: 7,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#6b7280",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
});
