import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'clear_reports_test_secret';

const { default: uploadRoutes } = await import('../src/routes/uploadRoutes.js');
const { default: returnRoutes } = await import('../src/routes/returnRoutes.js');
const { User } = await import('../src/models/User.js');
const { Upload } = await import('../src/models/Upload.js');
const { OrderLine } = await import('../src/models/OrderLine.js');
const { ReturnReport } = await import('../src/models/ReturnReport.js');

function startTestServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/returns', returnRoutes);
  const server = http.createServer(app);
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test('DELETE /api/uploads clears period uploads, OrderLines, and files; DELETE /api/returns/:id clears return files', async (t) => {
  const token = jwt.sign({ userId: 'u1' }, process.env.JWT_SECRET);
  const headers = { Authorization: `Bearer ${token}` };

  t.mock.method(User, 'findById', () => ({
    select: async () => ({ _id: 'u1' }),
  }));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gst-clear-'));
  const uploadFile = path.join(tmpDir, 'fk.xlsx');
  const jsonFile = path.join(tmpDir, 'gstr1.json');
  const xlsxFile = path.join(tmpDir, 'gstr1.xlsx');
  fs.writeFileSync(uploadFile, 'x');
  fs.writeFileSync(jsonFile, '{}');
  fs.writeFileSync(xlsxFile, 'x');

  const { server, baseUrl } = await startTestServer();
  t.after(() => {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // 1. DELETE /api/uploads requires businessId and period
  const badRes = await fetch(`${baseUrl}/api/uploads?businessId=b1`, { method: 'DELETE', headers });
  assert.equal(badRes.status, 400);

  // 2. DELETE /api/uploads clears period Upload + OrderLine docs + disk file
  let deletedLinesFilter = null;
  let deletedUploadsFilter = null;
  t.mock.method(Upload, 'find', async () => [{ _id: 'up1', storedFilePath: uploadFile }]);
  t.mock.method(OrderLine, 'deleteMany', async (filter) => {
    deletedLinesFilter = filter;
    return { deletedCount: 327 };
  });
  t.mock.method(Upload, 'deleteMany', async (filter) => {
    deletedUploadsFilter = filter;
    return { deletedCount: 1 };
  });

  const clearRes = await fetch(`${baseUrl}/api/uploads?businessId=b1&period=102026`, { method: 'DELETE', headers });
  assert.equal(clearRes.status, 200);
  const clearBody = await clearRes.json();
  assert.equal(clearBody.deletedUploads, 1);
  assert.equal(clearBody.deletedOrderLines, 327);
  assert.deepEqual(deletedLinesFilter, { userId: 'u1', businessId: 'b1', period: '102026' });
  assert.deepEqual(deletedUploadsFilter, { userId: 'u1', businessId: 'b1', period: '102026' });
  assert.equal(fs.existsSync(uploadFile), false);

  // 3. DELETE /api/returns/:id handles 404 and deletes report + exported files
  t.mock.method(ReturnReport, 'findOne', async ({ _id }) => (
    _id === 'missing' ? null : { _id: 'r1', jsonFilePath: jsonFile, excelFilePath: xlsxFile }
  ));
  let deletedReportFilter = null;
  t.mock.method(ReturnReport, 'deleteOne', async (filter) => {
    deletedReportFilter = filter;
    return { deletedCount: 1 };
  });

  const notFoundRes = await fetch(`${baseUrl}/api/returns/missing`, { method: 'DELETE', headers });
  assert.equal(notFoundRes.status, 404);

  const delRetRes = await fetch(`${baseUrl}/api/returns/r1`, { method: 'DELETE', headers });
  assert.equal(delRetRes.status, 200);
  assert.deepEqual(deletedReportFilter, { _id: 'r1' });
  assert.equal(fs.existsSync(jsonFile), false);
  assert.equal(fs.existsSync(xlsxFile), false);
});
