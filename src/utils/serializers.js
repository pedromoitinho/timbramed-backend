export function normalizeReport(report) {
  return {
    id: report.id,
    hospitalId: report.hospitalId,
    medicoId: report.medicoId,
    pacienteNome: report.pacienteNome,
    mensagemFinal: report.mensagemFinal,
    cid: report.cid,
    dataRelatorio: report.dataRelatorio,
    status: report.status,
    impressoEm: report.impressoEm,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  }
}
