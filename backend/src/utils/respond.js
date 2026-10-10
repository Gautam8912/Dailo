/**
 * Response helpers — one envelope for the whole API:
 *   { success: true, data, meta? }  |  { success: false, error, message }
 */
'use strict';

function ok(res, data, meta) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.json(body);
}

function created(res, data, meta) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(201).json(body);
}

function paged(res, result) {
  return res.json({
    success: true,
    data: result.data,
    meta: { total: result.total, page: result.page, pages: result.pages, limit: result.limit },
  });
}

module.exports = { ok, created, paged };
