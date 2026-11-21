/** No server calls or email delivery. Data processing is local to the browser. */
export namespace CertifyCore {
  export type Student = { id: string; name: string; email: string; score: number; course: string; row: number };
  export type ParseIssue = { row: number; message: string };
  export type ParseResult = { students: Student[]; issues: ParseIssue[]; sourceCount: number };

  export function parseRows(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [], field = '', quoted = false;
    const normalized = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (ch === '"') {
        if (quoted && normalized[i + 1] === '"') { field += '"'; i++; }
        else if (!quoted && field.length && field.trim() !== '') { throw new Error('Unexpected quote inside an unquoted field.'); }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) { row.push(field); field = ''; }
      else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && normalized[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(v => v.trim().length > 0)) rows.push(row);
        row = [];
      } else { field += ch; }
    }
    if (quoted) throw new Error('CSV contains an unfinished quoted field.');
    row.push(field);
    if (row.some(v => v.trim().length > 0)) rows.push(row);
    return rows;
  }

  export function parseStudentCSV(text: string, defaultCourse: string): ParseResult {
    const rows = parseRows(text);
    if (!rows.length) throw new Error('The CSV file is empty.');
    const headers = rows[0].map(v => v.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    function column(aliases: string[]): number { return headers.findIndex(h => aliases.indexOf(h) >= 0); }
    const nameIndex = column(['name', 'studentname', 'fullname']);
    const emailIndex = column(['email', 'emailaddress', 'studentemail']);
    const scoreIndex = column(['score', 'marks', 'mark', 'grade', 'percent', 'percentage', 'scorepercent']);
    const courseIndex = column(['course', 'coursename', 'program', 'training']);
    if (nameIndex < 0 || emailIndex < 0 || scoreIndex < 0) {
      throw new Error('Required CSV columns: Name, Email, Score. Course is optional.');
    }
    if (rows.length > 5001) throw new Error('This demo supports a maximum of 5,000 student records.');
    const seen = new Set<string>(), students: Student[] = [], issues: ParseIssue[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i], sourceRow = i + 1;
      const name = (r[nameIndex] || '').trim();
      const email = (r[emailIndex] || '').trim();
      const rawScore = (r[scoreIndex] || '').trim().replace(/%$/, '').trim();
      const course = (courseIndex >= 0 ? (r[courseIndex] || '').trim() : '') || defaultCourse.trim();
      if (!name || !email || !rawScore || !course) { issues.push({ row: sourceRow, message: 'Missing name, email, score, or course.' }); continue; }
      if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)) { issues.push({ row: sourceRow, message: 'Invalid email address.' }); continue; }
      const score = Number(rawScore);
      if (!Number.isFinite(score) || score < 0 || score > 100) { issues.push({ row: sourceRow, message: 'Score must be a number between 0 and 100.' }); continue; }
      const key = (email + '|' + course).toLowerCase();
      if (seen.has(key)) { issues.push({ row: sourceRow, message: 'Duplicate email and course combination.' }); continue; }
      seen.add(key);
      students.push({ id: 'csv-' + sourceRow, name, email, score, course, row: sourceRow });
    }
    return { students, issues, sourceCount: rows.length - 1 };
  }

  export function escapeCSV(value: string | number): string {
    let s = String(value);
    // Protect spreadsheet users from formula injection in exports.
    if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  export function toCSV(rows: Array<Array<string | number>>): string {
    return rows.map(row => row.map(escapeCSV).join(',')).join('\r\n') + '\r\n';
  }

  export function messageFor(student: Student, threshold: number): { subject: string; body: string; type: 'certificate' | 'retake' } {
    const passed = student.score >= threshold;
    if (passed) return {
      type: 'certificate', subject: `Your certificate for ${student.course}`,
      body: `Hello ${student.name},\n\nCongratulations on successfully completing ${student.course}! Your result was ${student.score}%, meeting the passing threshold of ${threshold}%.\n\nYour personalized certificate is ready for download. In the full delivery version, the certificate would be attached to this message.\n\nBest regards,\nCourse Administration`
    };
    return { type: 'retake', subject: `Course result and next steps: ${student.course}`,
      body: `Hello ${student.name},\n\nThank you for participating in ${student.course}. Your result was ${student.score}%, below the passing threshold of ${threshold}%.\n\nYou have not met the completion requirement at this time. Please contact your course administrator for information about retaking the course.\n\nBest regards,\nCourse Administration` };
  }

  export function escapeHtml(value: string): string {
    return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  export const demoStudents: Student[] = [
    {id:'demo-1',name:'Avery Chen',email:'avery.chen@example.com',course:'Python Foundations',score:91,row:2},
    {id:'demo-2',name:'Jordan Lee',email:'jordan.lee@example.com',course:'Data Analysis',score:78,row:3},
    {id:'demo-3',name:'Morgan Taylor',email:'morgan.taylor@example.com',course:'Python Foundations',score:43,row:4},
    {id:'demo-4',name:'Casey Brooks',email:'casey.brooks@example.com',course:'Data Analysis',score:88,row:5},
    {id:'demo-5',name:'Riley Patel',email:'riley.patel@example.com',course:'Product Design',score:84,row:6},
    {id:'demo-6',name:'Noah Williams',email:'noah.williams@example.com',course:'Product Design',score:39,row:7},
    {id:'demo-7',name:'Sage Rivera',email:'sage.rivera@example.com',course:'Python Foundations',score:95,row:8},
    {id:'demo-8',name:'Jamie Okafor',email:'jamie.okafor@example.com',course:'Data Analysis',score:63,row:9},
    {id:'demo-9',name:'Alex Morgan',email:'alex.morgan@example.com',course:'Product Design',score:92,row:10},
    {id:'demo-10',name:'Kai Thompson',email:'kai.thompson@example.com',course:'Python Foundations',score:47,row:11},
    {id:'demo-11',name:'Harper Kim',email:'harper.kim@example.com',course:'Data Analysis',score:74,row:12},
    {id:'demo-12',name:'Drew Adeyemi',email:'drew.adeyemi@example.com',course:'Product Design',score:81,row:13},
  ];

  export function sampleCSV(): string {
    return toCSV([['Name','Email','Course','Score'], ...demoStudents.map(s => [s.name, s.email, s.course, s.score])]);
  }
}
