import api from "./api";
export const getReports = () => api.get("/reports");
export const generateReport = (payload: any) => api.post("/reports", payload);
export const downloadReport = (id: number) =>
  api.get<ArrayBuffer>(`/reports/${id}/download`, { responseType: "arraybuffer" });
