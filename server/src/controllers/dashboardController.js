import { dashboardPerformance, dashboardSummary } from '../services/dashboardService.js';

export async function summary(request, response) {
  response.status(200).json({ success: true, data: await dashboardSummary(request.user.id) });
}

export async function performance(request, response) {
  response.status(200).json({ success: true, data: await dashboardPerformance(request.user.id) });
}
