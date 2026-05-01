import * as service from './service.js';

export async function dashboard(req, res) {
  const data = await service.getDashboard(req.params.id);
  res.json(data);
}

function sendCsv(res, filename, body) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}

export async function exportGoals(req, res) {
  const csv = await service.buildGoalsCsv(req.params.id);
  sendCsv(res, 'goals.csv', csv);
}

export async function exportActionItems(req, res) {
  const csv = await service.buildActionItemsCsv(req.params.id);
  sendCsv(res, 'action-items.csv', csv);
}

export async function exportAudit(req, res) {
  const csv = await service.buildAuditCsv(req.params.id);
  sendCsv(res, 'audit.csv', csv);
}
