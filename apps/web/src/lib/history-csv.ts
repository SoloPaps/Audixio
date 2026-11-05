import { type HistoryView, historyTable } from './history.js';

// Export « Exporter » de /historique : l’historique du site en CSV
// (séparateur « ; », BOM pour Excel), mêmes colonnes que le tableau.

function cell(value: string): string {
  return /[";\r\n]/u.test(value) ? `"${value.replace(/"/gu, '""')}"` : value;
}

export function historyCsv(view: HistoryView): string {
  const table = historyTable(view.points, view.series);
  const lines = [
    table.columns.map((column) => cell(column.label)).join(';'),
    ...table.rows.map((row) => row.map((item) => cell(item.text)).join(';')),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function historyCsvName(host: string): string {
  const safe = host.toLowerCase().replace(/[^a-z0-9.-]+/gu, '-');
  return `audixio-historique-${safe || 'site'}.csv`;
}
