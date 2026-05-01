import * as service from './service.js';

export async function list(req, res) {
  const result = await service.listAuditLogs(req.params.id, req.query);
  res.json(result);
}
