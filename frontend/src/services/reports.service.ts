import api from "./api";
export const getReports = () => api.get("/reports");
export const generateReport = (payload: any) => api.post("/reports", payload);
export const getReportPreviewCount = (params: { periodStart: string; periodEnd: string; publishedOnly: boolean }) =>
  api.get<{ count: number; publishedOnly: boolean }>("/reports/preview-count", {
    params: { ...params, publishedOnly: String(params.publishedOnly) },
  });
export const downloadReport = (id: number) =>
  api.get<ArrayBuffer>(`/reports/${id}/download`, { responseType: "arraybuffer" });
