// Tenant ID is the first path segment of the Pages URL:
//   https://jewish-kneset.github.io/<tenant-id>/  ->  "<tenant-id>"
// Nothing here is tenant-specific, so this file is identical in every tenant repo.
const tenantId = location.pathname.split('/').filter(Boolean)[0] ?? '';
const app = document.getElementById('app');

const line = (text) => {
  const p = document.createElement('p');
  p.textContent = text; // textContent, never innerHTML — config.json is untrusted input
  app.appendChild(p);
};

fetch('./config.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((cfg) => {
    line(cfg?.tenant?.displayName ?? tenantId);
    line('מסך התצוגה מנוהל באמצעות אפליקציית Smart Clock.');
    const a = document.createElement('a');
    a.href = `https://jewish-kneset.github.io/kneset-cms/?tenant=${encodeURIComponent(tenantId)}`;
    a.textContent = 'ניהול תוכן';
    app.appendChild(a);
  })
  .catch(() => line(tenantId));
