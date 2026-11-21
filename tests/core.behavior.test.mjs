import test from 'node:test';
import assert from 'node:assert/strict';
import { CertifyCore } from '../.test-dist/core.js';

const { parseStudentCSV, messageFor, escapeCSV, toCSV, sampleCSV, demoStudents } = CertifyCore;

test('imports a valid CSV with optional course and comma in quoted names', () => {
  const text = 'Name,Email,Score,Course\n"Avery, Lee",avery@example.com,91,Python\nJordan,jordan@example.com,49,Python\n';
  const result = parseStudentCSV(text, 'Fallback');
  assert.equal(result.students.length, 2);
  assert.equal(result.issues.length, 0);
  assert.equal(result.students[0].name, 'Avery, Lee');
  assert.equal(result.students[1].score, 49);
});

test('supports recovered NCAIR CSV column layout', () => {
  const result = parseStudentCSV('Name,MetricNumber,Score,Email\nAvery,12,75,avery@example.com', 'Default Course');
  assert.equal(result.students[0].course, 'Default Course');
  assert.equal(result.students[0].score, 75);
});

test('rejects duplicate email and course pairs and out-of-range scores', () => {
  const result = parseStudentCSV('Name,Email,Score,Course\nOne,one@example.com,89,Python\nTwo,one@example.com,64,Python\nThree,three@example.com,101,Python', 'Other');
  assert.equal(result.students.length, 1);
  assert.equal(result.issues.length, 2);
});

test('rejects missing required columns and malformed quotes', () => {
  assert.throws(() => parseStudentCSV('Name,Email\nA,B', 'Other'), /Required CSV columns/);
  assert.throws(() => parseStudentCSV('Name,Email,Score\n"broken,b@example.com,41', 'Other'), /unfinished quoted/);
});

test('classifies pass and retake messages at a configurable threshold', () => {
  const result = parseStudentCSV('Name,Email,Score\nA,a@example.com,50\nB,b@example.com,49', 'Python');
  assert.equal(messageFor(result.students[0], 50).type, 'certificate');
  assert.equal(messageFor(result.students[1], 50).type, 'retake');
  assert.equal(messageFor(result.students[0], 70).type, 'retake');
});

test('safely escapes spreadsheet formulas in CSV export', () => {
  assert.ok(escapeCSV('=SUM(1,1)').includes("'=SUM"));
  assert.ok(toCSV([['Name','Score'],['A, B',40]]).includes('"A, B"'));
});

test('provides a fictional cohort and parsable sample', () => {
  assert.equal(demoStudents.length, 12);
  assert.equal(parseStudentCSV(sampleCSV(), 'Fallback').students.length, 12);
});
