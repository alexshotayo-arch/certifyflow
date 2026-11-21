import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Test the same compiled CSV and rules engine shipped to browsers.
const bundle = readFileSync(new URL('../web/dist/app.js', import.meta.url), 'utf8');
const stop = bundle.indexOf('var CertifyPDF;');
if (stop < 0) throw new Error('Could not isolate CertifyCore from the bundle');
const context = {};
runInNewContext(bundle.slice(0, stop) + '\nthis.core = CertifyCore;', context);
const { parseStudentCSV, parseRows, messageFor, toCSV } = context.core;

test('CSV recognizes quoted commas in names', () => {
  const rows = parseRows('Name,Email,Score\n"Lee, Jordan",jordan@example.com,78\n');
  assert.equal(rows[1][0], 'Lee, Jordan');
});

test('imports valid records and derives course default', () => {
  const result = parseStudentCSV('Name,Email,Score\nAvery Chen,avery@example.com,91\n', 'Python Foundations');
  assert.equal(result.students.length, 1);
  assert.equal(result.students[0].course, 'Python Foundations');
  assert.equal(result.students[0].score, 91);
  assert.equal(result.issues.length, 0);
});

test('rejects invalid email, score and duplicates with row feedback', () => {
  const csv = 'Name,Email,Course,Score\nAlex,alex@example.com,Intro,92\nAlex,alex@example.com,Intro,88\nMia,not-email,Intro,60\nEli,eli@example.com,Intro,101\n';
  const result = parseStudentCSV(csv, 'Intro');
  assert.equal(result.students.length, 1);
  assert.equal(result.issues.length, 3);
  assert.equal(result.sourceCount, 4);
});

test('passing score yields completion draft, failing score yields retake draft', () => {
  const student = { name: 'Avery Chen', email: 'avery@example.com', course: 'Python', score: 50 };
  assert.equal(messageFor(student, 50).type, 'certificate');
  assert.equal(messageFor({ ...student, score: 49 }, 50).type, 'retake');
});

test('CSV export neutralizes spreadsheet formula injection', () => {
  const exported = toCSV([['Name', 'Score'], ['=SUM(1,2)', 10]]);
  assert.ok(exported.includes("'=SUM"));
});
