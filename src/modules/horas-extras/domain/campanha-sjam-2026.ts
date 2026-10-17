// Transcrição parametrizada das cópias SEI fornecidas; valores informativos não
// entram nas projeções financeiras de contas nem geram saldo automaticamente.
export function minutaCampanhaSjam2026() {
  return {
    code: "SJAM-HE-2026-DIREF-26097342",
    name: "Servico extraordinario SJAM 2026 - Despacho 26097342",
    fiscalYear: 2026,
    seiProcess: "0000320-27.2026.4.01.8002",
    authorizationDocument: "Despacho SJAM-DIREF 26097342",
    projectDeadline: "2026-10-21",
    proofDeadline: "2026-11-19",
    rules: {
      minimumBusinessDays: 5,
      weekdayDailyLimitMinutes: 120,
      monthlyLimitMinutes: 2640,
      annualLimitMinutes: 12000,
      amendmentsRequireNewFormAndPriorDirefReview: true,
      saturdayRequiresWeekdayImpossibility: true,
      sundayHolidayRequiresWeekdayAndSaturdayAnalysis: true,
      conversionAboveUnitAllocation: "PENDING_WHOLE_REQUEST_OR_EXCESS_DECISION",
      proofDeadlineConflictWithCjfArticle49: "PENDING_REVIEW",
      administrativeUnitsRequireDirefReview: true,
      rioNegroAirConditioningMinimumSimultaneousUnits: 5,
      referenceAmounts: { VARA: "18000.00", TURMA_RECURSAL: "18000.00", CENTRO_CONCILIACAO: "5000.00" },
      observations: {
        date: "2026-10-14",
        prospectiveSupplement: "250991.00",
        reportedAvailableAtDocumentDate: "6233.27",
        commitmentPendingSepagReview: "20620.77",
        commitmentReference: "2026NE000016",
        generatesOperationalBalance: false,
      },
      pendingFullText: ["Circular DIGES 46/2026 - SEI 25922536", "Encaminhamento SECAD 26097335", "E-mail SECOR 26096723"],
    },
    sourceManifest: [
      { sei: "26096685", crc: "06D21573", sha256: "68d22eda2e91c37ff77138a8b486976d6650741502bdf6f10cb7fbd013b14073" },
      { sei: "26097342", crc: "6F1CE3BA", sha256: "9b3749b58d5fc6dfaede41b5feb35fba9a466100fd9a9f63906cb225e05f7e97" },
    ],
  };
}
