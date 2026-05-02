export function normalizeReport(report) {
  return {
    id: report.id,
    hospitalId: report.hospitalId,
    medicoId: report.medicoId,
    sintomaId: report.sintomaId,
    pacienteNome: report.pacienteNome,
    sintomaNome: report.sintomaNome,
    mensagemFinal: report.mensagemFinal,
    cid: report.cid,
    dataRelatorio: report.dataRelatorio,
    status: report.status,
    impressoEm: report.impressoEm,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  }
}
