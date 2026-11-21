/** No server calls or email delivery. Data processing is local to the browser. */
var CertifyCore;
(function (CertifyCore) {
    function parseRows(text) {
        const rows = [];
        let row = [], field = '', quoted = false;
        const normalized = text.replace(/^\uFEFF/, '');
        for (let i = 0; i < normalized.length; i++) {
            const ch = normalized[i];
            if (ch === '"') {
                if (quoted && normalized[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else if (!quoted && field.length && field.trim() !== '') {
                    throw new Error('Unexpected quote inside an unquoted field.');
                }
                else
                    quoted = !quoted;
            }
            else if (ch === ',' && !quoted) {
                row.push(field);
                field = '';
            }
            else if ((ch === '\n' || ch === '\r') && !quoted) {
                if (ch === '\r' && normalized[i + 1] === '\n')
                    i++;
                row.push(field);
                field = '';
                if (row.some(v => v.trim().length > 0))
                    rows.push(row);
                row = [];
            }
            else {
                field += ch;
            }
        }
        if (quoted)
            throw new Error('CSV contains an unfinished quoted field.');
        row.push(field);
        if (row.some(v => v.trim().length > 0))
            rows.push(row);
        return rows;
    }
    CertifyCore.parseRows = parseRows;
    function parseStudentCSV(text, defaultCourse) {
        const rows = parseRows(text);
        if (!rows.length)
            throw new Error('The CSV file is empty.');
        const headers = rows[0].map(v => v.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        function column(aliases) { return headers.findIndex(h => aliases.indexOf(h) >= 0); }
        const nameIndex = column(['name', 'studentname', 'fullname']);
        const emailIndex = column(['email', 'emailaddress', 'studentemail']);
        const scoreIndex = column(['score', 'marks', 'mark', 'grade', 'percent', 'percentage', 'scorepercent']);
        const courseIndex = column(['course', 'coursename', 'program', 'training']);
        if (nameIndex < 0 || emailIndex < 0 || scoreIndex < 0) {
            throw new Error('Required CSV columns: Name, Email, Score. Course is optional.');
        }
        if (rows.length > 5001)
            throw new Error('This demo supports a maximum of 5,000 student records.');
        const seen = new Set(), students = [], issues = [];
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i], sourceRow = i + 1;
            const name = (r[nameIndex] || '').trim();
            const email = (r[emailIndex] || '').trim();
            const rawScore = (r[scoreIndex] || '').trim().replace(/%$/, '').trim();
            const course = (courseIndex >= 0 ? (r[courseIndex] || '').trim() : '') || defaultCourse.trim();
            if (!name || !email || !rawScore || !course) {
                issues.push({ row: sourceRow, message: 'Missing name, email, score, or course.' });
                continue;
            }
            if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)) {
                issues.push({ row: sourceRow, message: 'Invalid email address.' });
                continue;
            }
            const score = Number(rawScore);
            if (!Number.isFinite(score) || score < 0 || score > 100) {
                issues.push({ row: sourceRow, message: 'Score must be a number between 0 and 100.' });
                continue;
            }
            const key = (email + '|' + course).toLowerCase();
            if (seen.has(key)) {
                issues.push({ row: sourceRow, message: 'Duplicate email and course combination.' });
                continue;
            }
            seen.add(key);
            students.push({ id: 'csv-' + sourceRow, name, email, score, course, row: sourceRow });
        }
        return { students, issues, sourceCount: rows.length - 1 };
    }
    CertifyCore.parseStudentCSV = parseStudentCSV;
    function escapeCSV(value) {
        let s = String(value);
        // Protect spreadsheet users from formula injection in exports.
        if (/^[\s]*[=+@\-]/.test(s))
            s = "'" + s;
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    CertifyCore.escapeCSV = escapeCSV;
    function toCSV(rows) {
        return rows.map(row => row.map(escapeCSV).join(',')).join('\r\n') + '\r\n';
    }
    CertifyCore.toCSV = toCSV;
    function messageFor(student, threshold) {
        const passed = student.score >= threshold;
        if (passed)
            return {
                type: 'certificate', subject: `Your certificate for ${student.course}`,
                body: `Hello ${student.name},\n\nCongratulations on successfully completing ${student.course}! Your result was ${student.score}%, meeting the passing threshold of ${threshold}%.\n\nYour personalized certificate is ready for download. In the full delivery version, the certificate would be attached to this message.\n\nBest regards,\nCourse Administration`
            };
        return { type: 'retake', subject: `Course result and next steps: ${student.course}`,
            body: `Hello ${student.name},\n\nThank you for participating in ${student.course}. Your result was ${student.score}%, below the passing threshold of ${threshold}%.\n\nYou have not met the completion requirement at this time. Please contact your course administrator for information about retaking the course.\n\nBest regards,\nCourse Administration` };
    }
    CertifyCore.messageFor = messageFor;
    function escapeHtml(value) {
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    CertifyCore.escapeHtml = escapeHtml;
    CertifyCore.demoStudents = [
        { id: 'demo-1', name: 'Avery Chen', email: 'avery.chen@example.com', course: 'Python Foundations', score: 91, row: 2 },
        { id: 'demo-2', name: 'Jordan Lee', email: 'jordan.lee@example.com', course: 'Data Analysis', score: 78, row: 3 },
        { id: 'demo-3', name: 'Morgan Taylor', email: 'morgan.taylor@example.com', course: 'Python Foundations', score: 43, row: 4 },
        { id: 'demo-4', name: 'Casey Brooks', email: 'casey.brooks@example.com', course: 'Data Analysis', score: 88, row: 5 },
        { id: 'demo-5', name: 'Riley Patel', email: 'riley.patel@example.com', course: 'Product Design', score: 84, row: 6 },
        { id: 'demo-6', name: 'Noah Williams', email: 'noah.williams@example.com', course: 'Product Design', score: 39, row: 7 },
        { id: 'demo-7', name: 'Sage Rivera', email: 'sage.rivera@example.com', course: 'Python Foundations', score: 95, row: 8 },
        { id: 'demo-8', name: 'Jamie Okafor', email: 'jamie.okafor@example.com', course: 'Data Analysis', score: 63, row: 9 },
        { id: 'demo-9', name: 'Alex Morgan', email: 'alex.morgan@example.com', course: 'Product Design', score: 92, row: 10 },
        { id: 'demo-10', name: 'Kai Thompson', email: 'kai.thompson@example.com', course: 'Python Foundations', score: 47, row: 11 },
        { id: 'demo-11', name: 'Harper Kim', email: 'harper.kim@example.com', course: 'Data Analysis', score: 74, row: 12 },
        { id: 'demo-12', name: 'Drew Adeyemi', email: 'drew.adeyemi@example.com', course: 'Product Design', score: 81, row: 13 },
    ];
    function sampleCSV() {
        return toCSV([['Name', 'Email', 'Course', 'Score'], ...CertifyCore.demoStudents.map(s => [s.name, s.email, s.course, s.score])]);
    }
    CertifyCore.sampleCSV = sampleCSV;
})(CertifyCore || (CertifyCore = {}));
/** Offline PDF and ZIP generation. PDFs use high-resolution raster certificate art. */
var CertifyPDF;
(function (CertifyPDF) {
    function text(ctx, str, x, y, size, color, weight = '400', font = 'Arial, sans-serif') {
        ctx.fillStyle = color;
        ctx.font = `${weight} ${size}px ${font}`;
        ctx.textAlign = 'center';
        ctx.fillText(str, x, y);
    }
    function makeCertificateCanvas(name, course, issued) {
        const c = document.createElement('canvas');
        c.width = 1400;
        c.height = 990;
        const ctx = c.getContext('2d');
        const W = c.width, H = c.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f7f5ff';
        ctx.beginPath();
        ctx.moveTo(W, 0);
        ctx.lineTo(W, 235);
        ctx.lineTo(W - 310, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f2f0ff';
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, H - 245);
        ctx.lineTo(335, H);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4e36b5';
        ctx.lineWidth = 14;
        ctx.strokeRect(52, 50, W - 104, H - 100);
        ctx.strokeStyle = '#dfb96f';
        ctx.lineWidth = 3;
        ctx.strokeRect(78, 76, W - 156, H - 152);
        ctx.fillStyle = '#4e36b5';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(425, 0);
        ctx.lineTo(0, 260);
        ctx.fill();
        ctx.fillStyle = '#a38cff';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(180, 0);
        ctx.lineTo(0, 110);
        ctx.fill();
        ctx.fillStyle = '#4e36b5';
        ctx.beginPath();
        ctx.moveTo(W, H);
        ctx.lineTo(W - 425, H);
        ctx.lineTo(W, H - 260);
        ctx.fill();
        text(ctx, '✦', W / 2, 202, 65, '#be984d', '400', 'Georgia, serif');
        text(ctx, 'CERTIFICATE OF COMPLETION', W / 2, 288, 53, '#202044', '700');
        text(ctx, 'THIS CERTIFIES THAT', W / 2, 370, 20, '#78748f', '600');
        const displayName = name.length > 28 ? name.slice(0, 27) + '…' : name;
        const nameSize = displayName.length > 19 ? 59 : 74;
        text(ctx, displayName, W / 2, 485, nameSize, '#39267e', '700', 'Georgia, serif');
        ctx.strokeStyle = '#d8caef';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 350, 518);
        ctx.lineTo(W / 2 + 350, 518);
        ctx.stroke();
        text(ctx, 'has successfully completed', W / 2, 585, 25, '#69617d');
        const displayCourse = course.length > 44 ? course.slice(0, 43) + '…' : course;
        const courseSize = displayCourse.length > 29 ? 37 : 48;
        text(ctx, displayCourse, W / 2, 657, courseSize, '#2a2850', '700');
        text(ctx, 'Presented in recognition of commitment and achievement', W / 2, 727, 22, '#79738b');
        ctx.strokeStyle = '#c4b7e7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(270, 850);
        ctx.lineTo(570, 850);
        ctx.moveTo(830, 850);
        ctx.lineTo(1130, 850);
        ctx.stroke();
        text(ctx, 'COURSE ADMINISTRATION', 420, 878, 19, '#777189', '600');
        text(ctx, issued, 980, 878, 19, '#777189', '600');
        return c;
    }
    CertifyPDF.makeCertificateCanvas = makeCertificateCanvas;
    function encode(s) { return new TextEncoder().encode(s); }
    function concat(chunks) { const length = chunks.reduce((a, c) => a + c.length, 0); const all = new Uint8Array(length); let offset = 0; for (const c of chunks) {
        all.set(c, offset);
        offset += c.length;
    } return all; }
    function toCertificatePDF(name, course, issued) {
        const canvas = makeCertificateCanvas(name, course, issued);
        const b64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        const raw = atob(b64);
        const jpg = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++)
            jpg[i] = raw.charCodeAt(i);
        const pieces = [];
        let position = 0;
        const offsets = [0];
        function put(s) { const bytes = typeof s === 'string' ? encode(s) : s; pieces.push(bytes); position += bytes.length; }
        function obj(id, prefix, bytes, suffix) {
            offsets[id] = position;
            put(`${id} 0 obj\n${prefix}`);
            if (bytes)
                put(bytes);
            if (suffix)
                put(suffix);
            put('\nendobj\n');
        }
        put('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
        obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
        obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
        obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
        obj(4, `<< /Type /XObject /Subtype /Image /Width 1400 /Height 990 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, '\nendstream');
        const cmd = encode('q 842 0 0 595 0 0 cm /Im0 Do Q\n');
        obj(5, `<< /Length ${cmd.length} >>\nstream\n`, cmd, 'endstream');
        const xref = position;
        put('xref\n0 6\n0000000000 65535 f \n');
        for (let i = 1; i <= 5; i++)
            put(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
        put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
        return concat(pieces);
    }
    CertifyPDF.toCertificatePDF = toCertificatePDF;
    function crc32(data) {
        let crc = 0xffffffff;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let k = 0; k < 8; k++)
                crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
        }
        return (crc ^ 0xffffffff) >>> 0;
    }
    function makeZip(items) {
        const out = [];
        const central = [];
        let offset = 0;
        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (Math.floor(now.getSeconds() / 2));
        const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
        function entry(name, data) {
            const file = encode(name), crc = crc32(data), size = data.length;
            const header = new Uint8Array(30 + file.length), h = new DataView(header.buffer);
            h.setUint32(0, 0x04034b50, true);
            h.setUint16(4, 20, true);
            h.setUint16(6, 0x800, true);
            h.setUint16(8, 0, true);
            h.setUint16(10, dosTime, true);
            h.setUint16(12, dosDate, true);
            h.setUint32(14, crc, true);
            h.setUint32(18, size, true);
            h.setUint32(22, size, true);
            h.setUint16(26, file.length, true);
            header.set(file, 30);
            out.push(header, data);
            const c = new Uint8Array(46 + file.length), v = new DataView(c.buffer);
            v.setUint32(0, 0x02014b50, true);
            v.setUint16(4, 20, true);
            v.setUint16(6, 20, true);
            v.setUint16(8, 0x800, true);
            v.setUint16(10, 0, true);
            v.setUint16(12, dosTime, true);
            v.setUint16(14, dosDate, true);
            v.setUint32(16, crc, true);
            v.setUint32(20, size, true);
            v.setUint32(24, size, true);
            v.setUint16(28, file.length, true);
            v.setUint32(42, offset, true);
            c.set(file, 46);
            central.push(c);
            offset += header.length + data.length;
        }
        for (const item of items)
            entry(item.name, item.data);
        const center = concat(central), end = new Uint8Array(22), view = new DataView(end.buffer);
        view.setUint32(0, 0x06054b50, true);
        view.setUint16(8, items.length, true);
        view.setUint16(10, items.length, true);
        view.setUint32(12, center.length, true);
        view.setUint32(16, offset, true);
        return concat([...out, center, end]);
    }
    CertifyPDF.makeZip = makeZip;
    function save(data, name, type) {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
    CertifyPDF.save = save;
    function filename(value) { return value.replace(/[^a-z0-9_\-]+/gi, '_').slice(0, 52).replace(/^_+|_+$/g, '') || 'student'; }
    CertifyPDF.filename = filename;
})(CertifyPDF || (CertifyPDF = {}));
const NAV = [
    { name: 'Dashboard', icon: 'grid' }, { name: 'Import Students', icon: 'upload' }, { name: 'Results', icon: 'bars' },
    { name: 'Certificates', icon: 'award' }, { name: 'Notifications', icon: 'mail' }, { name: 'Activity', icon: 'clock' }
];
function Icon(p) {
    return React.createElement("svg", { className: 'icon ' + (p.className || ''), width: p.size || 19, height: p.size || 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
        React.createElement("use", { xlinkHref: '#i-' + p.name }));
}
function Badge(p) {
    const mark = p.type === 'pass' ? 'check' : p.type === 'retake' ? 'x' : p.type === 'ready' ? 'mail' : 'file';
    return React.createElement("span", { className: 'badge badge-' + p.type },
        React.createElement(Icon, { name: mark, size: 13 }),
        p.children);
}
function Empty(p) {
    return React.createElement("div", { className: "empty" },
        React.createElement("div", { className: "empty-icon" },
            React.createElement(Icon, { name: p.icon, size: 30 })),
        React.createElement("h3", null, p.title),
        React.createElement("p", null, p.description),
        p.action);
}
class App extends React.Component {
    constructor(props) {
        super(props);
        this.fileInput = null;
        this.state = { page: 'Dashboard', students: CertifyCore.demoStudents.map(s => ({ ...s })), source: 'fictional demo cohort', threshold: 50, defaultCourse: 'Python Foundations', issues: [], filter: 'all', search: '', selected: 'demo-1', notificationsFilter: 'all', activity: [{ id: 1, time: 'Demo session', title: 'Sample cohort loaded', detail: 'Fictional student records are ready for review', icon: 'file' }], toast: '', uploadError: '', dragActive: false, mobileMenu: false, issueExpanded: false, confirmBulk: false };
    }
    getStudent() { return this.state.students.find(s => s.id === this.state.selected) || this.state.students[0]; }
    passed(s) { return s.score >= this.state.threshold; }
    getPassed() { return this.state.students.filter(s => this.passed(s)); }
    log(title, detail, icon = 'check') {
        this.setState((before) => ({ activity: [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title, detail, icon }, ...before.activity].slice(0, 35) }));
    }
    notify(text) { this.setState({ toast: text }); if (this.noticeTimeout)
        window.clearTimeout(this.noticeTimeout); this.noticeTimeout = window.setTimeout(() => this.setState({ toast: '' }), 4800); }
    pageTo(page) { this.setState({ page, mobileMenu: false, search: '', filter: 'all' }); window.scrollTo(0, 0); }
    uploadFail(message) {
        this.setState({ uploadError: message, page: 'Import Students', issueExpanded: true, dragActive: false });
        this.notify(message);
    }
    onFiles(files) {
        this.setState({ dragActive: false });
        if (!files || !files.length)
            return;
        const file = files[0];
        if (!/\.csv$/i.test(file.name)) {
            this.uploadFail(/\.xlsx?$/i.test(file.name) ?
                'That is an Excel workbook. Open it in Excel, choose File > Save As > CSV UTF-8 (.csv), and upload the saved CSV file.' :
                'Unsupported file. Choose a .csv file, or download the sample CSV below to see the required format.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            this.uploadFail('CSV files must be smaller than 2 MB in this demo.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const result = CertifyCore.parseStudentCSV(String(reader.result || ''), this.state.defaultCourse);
                if (!result.students.length) {
                    this.setState({ issues: result.issues, issueExpanded: true });
                    this.uploadFail('No valid student records found. Check the CSV columns and row errors below.');
                    return;
                }
                this.setState({ students: result.students, source: file.name, issues: result.issues, selected: result.students[0].id, filter: 'all', search: '', page: 'Results', uploadError: '', issueExpanded: result.issues.length > 0, confirmBulk: false });
                this.notify(`${result.students.length} students imported${result.issues.length ? ' • ' + result.issues.length + ' row(s) skipped' : ''}.`);
                this.log('CSV imported', `${result.students.length} valid records from ${file.name} · ${result.issues.length} rows skipped`, 'upload');
            }
            catch (err) {
                this.uploadFail(err instanceof Error ? err.message : 'Could not read the CSV file.');
            }
        };
        reader.onerror = () => this.uploadFail('The browser could not read that file. Try saving a fresh CSV UTF-8 copy.');
        reader.readAsText(file);
        if (this.fileInput)
            this.fileInput.value = '';
    }
    thresholdChange(raw) { const n = Number(raw); if (raw === '' || !Number.isFinite(n) || n < 0 || n > 100)
        return; this.setState({ threshold: n }); }
    downloadSample() { CertifyPDF.save(CertifyCore.sampleCSV(), 'certifyflow_sample_students.csv', 'text/csv;charset=utf-8'); this.log('Sample CSV exported', 'Downloaded fictional sample student data', 'download'); }
    exportResults() {
        const rows = [['Name', 'Email', 'Course', 'Score', 'Passing Threshold', 'Status', 'Draft Subject']];
        this.state.students.forEach(s => rows.push([s.name, s.email, s.course, s.score, this.state.threshold, this.passed(s) ? 'Passed' : 'Needs retake', CertifyCore.messageFor(s, this.state.threshold).subject]));
        CertifyPDF.save(CertifyCore.toCSV(rows), 'certifyflow_results.csv', 'text/csv;charset=utf-8');
        this.log('Results exported', `${this.state.students.length} reviewed student results`, 'download');
        this.notify('Results CSV downloaded.');
    }
    downloadCertificate(student) {
        if (!this.passed(student)) {
            this.notify('Only students who meet the passing threshold receive certificates.');
            return;
        }
        const bytes = CertifyPDF.toCertificatePDF(student.name, student.course, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
        CertifyPDF.save(bytes, CertifyPDF.filename(student.name) + '_certificate.pdf', 'application/pdf');
        this.log('Certificate downloaded', `${student.name} · ${student.course}`, 'award');
        this.notify(`Certificate downloaded for ${student.name}.`);
    }
    downloadAll() {
        const selected = this.getPassed();
        if (!selected.length) {
            this.notify('No passing students to generate certificates for.');
            return;
        }
        if (selected.length > 150) {
            this.notify('This demo supports up to 150 certificates per batch.');
            return;
        }
        const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const used = new Set();
        const items = selected.map((s) => {
            let file = CertifyPDF.filename(s.name) + '_' + CertifyPDF.filename(s.course), base = file, i = 2;
            while (used.has(file)) {
                file = base + '_' + i;
                i++;
            }
            used.add(file);
            return { name: file + '_certificate.pdf', data: CertifyPDF.toCertificatePDF(s.name, s.course, date) };
        });
        CertifyPDF.save(CertifyPDF.makeZip(items), 'certifyflow_certificates.zip', 'application/zip');
        this.setState({ confirmBulk: false });
        this.log('Certificate batch downloaded', `${selected.length} personalized PDFs packaged in a ZIP`, 'download');
        this.notify(`${selected.length} PDF certificates downloaded in a ZIP file.`);
    }
    exportDrafts() {
        const rows = [['Name', 'Email', 'Course', 'Outcome', 'Subject', 'Draft Email Body']];
        this.state.students.forEach(s => { const m = CertifyCore.messageFor(s, this.state.threshold); rows.push([s.name, s.email, s.course, this.passed(s) ? 'Passed' : 'Needs retake', m.subject, m.body]); });
        CertifyPDF.save(CertifyCore.toCSV(rows), 'certifyflow_email_drafts.csv', 'text/csv;charset=utf-8');
        this.notify('Email drafts exported. Nothing has been sent.');
        this.log('Email drafts downloaded', `${this.state.students.length} simulated notifications · no delivery`, 'mail');
    }
    async copyMessage(student) {
        const m = CertifyCore.messageFor(student, this.state.threshold);
        const content = `To: ${student.email}\nSubject: ${m.subject}\n\n${m.body}`;
        try {
            await navigator.clipboard.writeText(content);
            this.notify('Email draft copied. Nothing has been sent.');
        }
        catch {
            this.notify('Clipboard not available. You can select and copy the draft below.');
        }
    }
    studentList(filter = this.state.filter) {
        return this.state.students.filter(s => {
            const matches = filter === 'all' || (filter === 'passed' ? this.passed(s) : !this.passed(s));
            const q = this.state.search.trim().toLowerCase();
            return matches && (!q || [s.name, s.email, s.course, String(s.score)].some(t => t.toLowerCase().includes(q)));
        });
    }
    renderTop() {
        const titles = {
            'Dashboard': ['Course overview', 'From results to recognition, in one flow.'],
            'Import Students': ['Import students', 'Upload, validate, and prepare your next cohort.'],
            'Results': ['Student results', 'Review every score before generating certificates.'],
            'Certificates': ['Certificate studio', 'Create something worth celebrating.'],
            'Notifications': ['Notification drafts', 'Personalized messages, with no accidental sends.'],
            'Activity': ['Activity history', 'A record of actions during this demo session.']
        };
        const labels = titles[this.state.page];
        return React.createElement("header", { className: "topbar" },
            React.createElement("div", { className: "heading-group" },
                React.createElement("button", { className: "mobile-nav-toggle", onClick: () => this.setState({ mobileMenu: !this.state.mobileMenu }), "aria-label": "Toggle menu" },
                    React.createElement(Icon, { name: "menu" })),
                React.createElement("div", null,
                    React.createElement("div", { className: "page-eyebrow" }, "WORKSPACE / CERTIFICATION"),
                    React.createElement("h1", null,
                        labels[0],
                        " ",
                        React.createElement("span", { className: "heading-spark" }, "\u2733")),
                    React.createElement("p", null, labels[1]))),
            React.createElement("div", { className: "top-actions" },
                React.createElement("span", { className: "workspace-chip" },
                    React.createElement(Icon, { name: "layers", size: 18 }),
                    " Demo workspace ",
                    React.createElement(Icon, { name: "chevron", size: 14 })),
                React.createElement("span", { className: "top-divider" }),
                React.createElement("button", { className: "notification-bell", onClick: () => this.pageTo('Notifications'), title: "View notification drafts" },
                    React.createElement(Icon, { name: "bell", size: 22 }),
                    React.createElement("i", null)),
                React.createElement("span", { className: "avatar" }, "CF")));
    }
    renderStats() {
        const all = this.state.students.length, pass = this.getPassed().length, fail = all - pass;
        const stats = [
            { name: 'Students imported', value: all, icon: 'users', kind: 'violet', sub: 'Ready for evaluation' },
            { name: 'Passed', value: pass, icon: 'check', kind: 'green', sub: all ? `${Math.round(pass / all * 100)}% of this cohort` : 'No records yet' },
            { name: 'Needs retake', value: fail, icon: 'x', kind: 'red', sub: all ? `${Math.round(fail / all * 100)}% of this cohort` : 'No records yet' },
            { name: 'Certificates ready', value: pass, icon: 'award', kind: 'purple', sub: 'Available as PDF' }
        ];
        return React.createElement("div", { className: "stats-grid" }, stats.map(s => React.createElement("div", { key: s.name, className: "stat-card" },
            React.createElement("div", { className: "stat-head" },
                React.createElement("span", { className: 'stat-icon ' + s.kind },
                    React.createElement(Icon, { name: s.icon, size: 24 })),
                React.createElement("div", null,
                    React.createElement("div", { className: "stat-name" }, s.name),
                    React.createElement("div", { className: "stat-value" }, s.value))),
            React.createElement("div", { className: "stat-footer" },
                React.createElement("span", { className: "stat-sub" }, s.sub),
                React.createElement("span", { className: 'stat-squiggle ' + s.kind },
                    React.createElement("svg", { viewBox: "0 0 90 30" },
                        React.createElement("path", { d: "M2 26 C16 25 22 7 34 12 S55 27 69 12 S80 8 88 2" })))))));
    }
    renderUploadZone(compact = false) {
        return React.createElement("div", { className: 'upload-zone ' + (compact ? 'upload-zone-compact ' : '') + (this.state.dragActive ? 'is-dragging' : ''), onDragOver: (ev) => { ev.preventDefault(); this.setState({ dragActive: true }); }, onDragLeave: (ev) => { ev.preventDefault(); this.setState({ dragActive: false }); }, onDrop: (ev) => { ev.preventDefault(); this.onFiles(ev.dataTransfer.files); } },
            React.createElement("div", { className: "csv-file-icon" },
                React.createElement(Icon, { name: "file", size: 31 }),
                React.createElement("span", null, "CSV")),
            React.createElement("strong", null, "Drag and drop your CSV file here"),
            React.createElement("small", null, "or click below to choose a file"),
            React.createElement("button", { className: "btn btn-primary", onClick: () => this.fileInput && this.fileInput.click() },
                React.createElement(Icon, { name: "upload", size: 17 }),
                " Upload CSV"),
            React.createElement("label", { className: "native-upload-label" },
                "Or browse files directly",
                React.createElement("input", { "aria-label": "Choose CSV file directly", className: "native-file-input", ref: (x) => this.fileInput = x, type: "file", accept: ".csv,text/csv", onChange: (e) => this.onFiles(e.target.files) })));
    }
    renderPipeline() {
        return React.createElement("div", { className: "process-list" }, [
            ['Import', 'Upload student results (CSV)'], ['Review', 'Check scores and outcomes'], ['Generate', 'Create personalized certificates'], ['Notify', 'Prepare email notifications']
        ].map((n, i) => React.createElement("div", { className: "process-step", key: i },
            React.createElement("span", { className: 'step-number ' + (i === 0 ? 'step-active' : '') }, i + 1),
            React.createElement("span", null,
                React.createElement("b", null, n[0]),
                React.createElement("small", null, n[1])))));
    }
    renderIntro() { return React.createElement("section", { className: "hero-card" },
        React.createElement("div", { className: "hero-copy" },
            React.createElement("span", { className: "mini-hero-label" }, "ONE UPLOAD. ALL DONE."),
            React.createElement("h2", null,
                "Ready to process",
                React.createElement("br", null),
                "your next cohort?"),
            React.createElement("p", null, "Upload a CSV of student results, set the passing threshold, and automatically prepare certificates and notifications."),
            React.createElement("div", { className: "hero-arc" })),
        this.renderUploadZone(true),
        this.renderPipeline()); }
    renderThreshold() { return React.createElement("label", { className: "threshold-control" },
        React.createElement("span", null, "Passing threshold:"),
        React.createElement("input", { "aria-label": "Passing threshold percent", type: "number", min: "0", max: "100", step: "1", value: this.state.threshold, onChange: (e) => this.thresholdChange(e.target.value) }),
        React.createElement("b", null, "%"),
        React.createElement(Icon, { name: "settings", size: 16 })); }
    renderStudentTable(limit) {
        const records = this.studentList(), display = typeof limit === 'number' ? records.slice(0, limit) : records.slice(0, 75);
        return React.createElement("div", { className: "table-wrap" },
            React.createElement("table", { className: "students-table" },
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", { className: "col-check" }, "#"),
                        React.createElement("th", null, "Name"),
                        React.createElement("th", null, "Course"),
                        React.createElement("th", null, "Score"),
                        React.createElement("th", null, "Status"),
                        React.createElement("th", null, "Notification"),
                        React.createElement("th", { className: "right" }, "Action"))),
                React.createElement("tbody", null, display.map((s, i) => React.createElement("tr", { key: s.id },
                    React.createElement("td", { className: "number-col" }, i + 1),
                    React.createElement("td", null,
                        React.createElement("div", { className: "student-name" }, s.name),
                        React.createElement("small", { className: "student-email" }, s.email)),
                    React.createElement("td", null, s.course),
                    React.createElement("td", null,
                        React.createElement("strong", null,
                            s.score,
                            "%")),
                    React.createElement("td", null, this.passed(s) ? React.createElement(Badge, { type: "pass" }, "Passed") : React.createElement(Badge, { type: "retake" }, "Retake")),
                    React.createElement("td", null, this.passed(s) ? React.createElement(Badge, { type: "ready" }, "Certificate ready") : React.createElement(Badge, { type: "draft" }, "Email draft")),
                    React.createElement("td", { className: "right" },
                        React.createElement("button", { className: "icon-action", title: "View student", onClick: () => { this.setState({ selected: s.id, page: this.passed(s) ? 'Certificates' : 'Notifications' }); window.scrollTo(0, 0); } },
                            React.createElement(Icon, { name: "arrow-right", size: 17 }))))))),
            display.length === 0 ? React.createElement(Empty, { icon: "search", title: "No records found", description: "Try a different search or filter." }) : null,
            records.length > display.length ? React.createElement("p", { className: "table-footer" },
                "Showing ",
                display.length,
                " of ",
                records.length,
                " records. Download all results to view the full list.") : null);
    }
    renderReview(isDashboard) {
        return React.createElement("section", { className: "panel review-panel" },
            React.createElement("div", { className: "panel-heading" },
                React.createElement("div", { className: "panel-heading-label" },
                    React.createElement(Icon, { name: "users", size: 24 }),
                    React.createElement("div", null,
                        React.createElement("h2", null, "Student review"),
                        React.createElement("p", null, "Review student results, passing status, and notification readiness."))),
                this.renderThreshold()),
            !isDashboard ? React.createElement("div", { className: "table-tools" },
                React.createElement("div", { className: "input-search" },
                    React.createElement(Icon, { name: "search", size: 18 }),
                    React.createElement("input", { placeholder: "Search students, email, or course", value: this.state.search, onChange: (e) => this.setState({ search: e.target.value }) })),
                React.createElement("div", { className: "segments" }, ['all', 'passed', 'retake'].map(f => React.createElement("button", { key: f, className: this.state.filter === f ? 'active' : '', onClick: () => this.setState({ filter: f }) }, f === 'all' ? 'All' : f === 'passed' ? 'Passed' : 'Needs retake'))),
                React.createElement("button", { className: "btn btn-light", onClick: () => this.exportResults() },
                    React.createElement(Icon, { name: "download", size: 16 }),
                    " Export CSV")) : null,
            this.renderStudentTable(isDashboard ? 4 : undefined),
            isDashboard ? React.createElement("div", { className: "panel-bottom" },
                React.createElement("span", null,
                    "Showing first 4 records from ",
                    this.state.source),
                React.createElement("button", { className: "text-link", onClick: () => this.pageTo('Results') },
                    "View all students ",
                    React.createElement(Icon, { name: "arrow-right", size: 15 }))) : null);
    }
    renderCertificatePanel() {
        const s = this.state.students.find(x => this.passed(x)) || this.state.students[0];
        return React.createElement("section", { className: "panel certificate-side" },
            React.createElement("div", { className: "panel-heading" },
                React.createElement("div", { className: "panel-heading-label" },
                    React.createElement(Icon, { name: "award", size: 25 }),
                    React.createElement("div", null,
                        React.createElement("h2", null, "Certificate preview")))),
            React.createElement("p", { className: "preview-explainer" }, "A personalized certificate for students who meet the passing threshold."),
            React.createElement("div", { className: "mini-certificate" },
                React.createElement("div", { className: "mini-cert-decoration" },
                    React.createElement("span", null, "\u2726")),
                React.createElement("small", null, "Certificate of Completion"),
                React.createElement("span", null, "This is to certify that"),
                React.createElement("strong", null, s ? s.name : 'Student Name'),
                React.createElement("span", null, "has successfully completed"),
                React.createElement("b", null, s ? s.course : 'Course Name'),
                React.createElement("i", null, "\u2605")),
            React.createElement("button", { className: "btn btn-soft w-full", onClick: () => this.pageTo('Certificates') },
                React.createElement(Icon, { name: "external", size: 17 }),
                " Open certificate studio"));
    }
    renderDemoNotice() { return React.createElement("div", { className: "notice-card" },
        React.createElement(Icon, { name: "send", size: 28 }),
        React.createElement("div", null,
            React.createElement("h3", null, "No emails sent in demo mode"),
            React.createElement("p", null, "Messages are drafted and previewed only. No real recipients will be contacted.")),
        React.createElement(Icon, { name: "info", className: "notice-info", size: 17 })); }
    renderDashboard() { return React.createElement("div", null,
        this.renderStats(),
        this.renderIntro(),
        React.createElement("div", { className: "bottom-grid" },
            React.createElement("div", null, this.renderReview(true)),
            React.createElement("aside", null,
                this.renderCertificatePanel(),
                this.renderDemoNotice()))); }
    renderIssues() { if (!this.state.issues.length)
        return null; const issues = this.state.issueExpanded ? this.state.issues : this.state.issues.slice(0, 3); return React.createElement("div", { className: "issues-panel" },
        React.createElement("div", { className: "issue-title" },
            React.createElement(Icon, { name: "alert", size: 19 }),
            " ",
            this.state.issues.length,
            " row(s) skipped during import ",
            React.createElement("button", { onClick: () => this.setState({ issueExpanded: !this.state.issueExpanded }) }, this.state.issueExpanded ? 'Collapse' : 'Show all')),
        React.createElement("ul", null, issues.map((x, i) => React.createElement("li", { key: i },
            "Row ",
            x.row,
            ": ",
            x.message)))); }
    renderImport() { return React.createElement("div", { className: "page-grid" },
        React.createElement("div", { className: "panel import-main" },
            React.createElement("div", { className: "section-kicker" }, "STEP 01 / IMPORT"),
            React.createElement("h2", null, "Bring your class results together."),
            React.createElement("p", { className: "muted" }, "Your file stays in this browser session. No records are transmitted to a server."),
            React.createElement("div", { className: "field-row" },
                React.createElement("label", { className: "field" },
                    React.createElement("span", null, "Default course name"),
                    React.createElement("input", { type: "text", value: this.state.defaultCourse, maxLength: 80, onChange: (e) => this.setState({ defaultCourse: e.target.value }) })),
                React.createElement("label", { className: "field" },
                    React.createElement("span", null, "Passing score (%)"),
                    React.createElement("input", { type: "number", value: this.state.threshold, min: 0, max: 100, onChange: (e) => this.thresholdChange(e.target.value) }))),
            this.state.uploadError ? React.createElement("div", { className: "upload-error", role: "alert" },
                React.createElement(Icon, { name: "info", size: 19 }),
                React.createElement("span", null,
                    React.createElement("b", null, "Import could not be completed."),                    " ",
                    this.state.uploadError),
                React.createElement("button", { "aria-label": "Dismiss upload error", onClick: () => this.setState({ uploadError: '' }) }, "\u00D7")) : null,
            this.renderUploadZone(),
            React.createElement("div", { className: "file-help" },
                React.createElement(Icon, { name: "shield", size: 17 }),
                " Use fictional or permitted student records only. Files are not stored after the page is closed."),
            this.renderIssues()),
        React.createElement("aside", { className: "panel import-help" },
            React.createElement("span", { className: "eyebrow" }, "CSV FORMAT"),
            React.createElement("h3", null, "Simple, flexible imports."),
            React.createElement("p", null, "Use a CSV file with one row per student. These columns are supported:"),
            React.createElement("div", { className: "code-card" },
                "Name, Email, Course, Score",
                React.createElement("br", null),
                "Avery Chen, avery@example.com,",
                React.createElement("br", null),
                "Python Foundations, 91"),
            React.createElement("div", { className: "format-list" },
                React.createElement("span", null,
                    React.createElement(Icon, { name: "check", size: 16 }),
                    " Name, Email, Score required"),
                React.createElement("span", null,
                    React.createElement(Icon, { name: "check", size: 16 }),
                    " Course column optional"),
                React.createElement("span", null,
                    React.createElement(Icon, { name: "check", size: 16 }),
                    " Quoted values supported"),
                React.createElement("span", null,
                    React.createElement(Icon, { name: "check", size: 16 }),
                    " Legacy MetricNumber ignored")),
            React.createElement("button", { className: "btn btn-light w-full", onClick: () => this.downloadSample() },
                React.createElement(Icon, { name: "download", size: 17 }),
                " Download sample CSV"))); }
    renderResults() { return React.createElement("div", null,
        React.createElement("div", { className: "inline-stats" },
            React.createElement("span", null,
                React.createElement("b", null, this.state.students.length),
                " imported"),
            React.createElement("span", null,
                React.createElement("b", null, this.getPassed().length),
                " passed"),
            React.createElement("span", null,
                React.createElement("b", null, this.state.students.length - this.getPassed().length),
                " need retake"),
            React.createElement("span", null,
                "Source: ",
                React.createElement("strong", null, this.state.source))),
        this.renderIssues(),
        this.renderReview(false),
        React.createElement("div", { className: "hint-footer" },
            React.createElement(Icon, { name: "info", size: 17 }),
            " Changing the threshold updates every result and draft immediately. Nothing is sent automatically.")); }
    renderCertificates() {
        const eligible = this.getPassed();
        const active = this.getStudent();
        const s = (active && this.passed(active)) ? active : eligible[0];
        return React.createElement("div", { className: "studio-layout" },
            React.createElement("section", { className: "panel studio-main" },
                React.createElement("div", { className: "section-kicker" }, "CERTIFICATE STUDIO"),
                React.createElement("div", { className: "panel-heading" },
                    React.createElement("div", null,
                        React.createElement("h2", null, "Celebrate every achievement."),
                        React.createElement("p", null, "Generate personalized PDF certificates using the results you've approved.")),
                    React.createElement(Badge, { type: "neutral" }, "Local generation")),
                eligible.length ? React.createElement("div", null,
                    React.createElement("div", { className: "field-row" },
                        React.createElement("label", { className: "field" },
                            React.createElement("span", null, "Select student"),
                            React.createElement("select", { value: s ? s.id : '', onChange: (e) => this.setState({ selected: e.target.value }) }, eligible.map(st => React.createElement("option", { key: st.id, value: st.id },
                                st.name,
                                " \u00B7 ",
                                st.course)))),
                        React.createElement("div", { className: "studio-count" },
                            React.createElement("small", null, "Eligible students"),
                            React.createElement("strong", null, eligible.length))),
                    React.createElement("div", { className: "large-cert" },
                        React.createElement("div", { className: "large-corner" }),
                        React.createElement("div", { className: "cert-star" }, "\u2726"),
                        React.createElement("h3", null, "CERTIFICATE OF COMPLETION"),
                        React.createElement("p", null, "THIS IS TO CERTIFY THAT"),
                        React.createElement("div", { className: "cert-student" }, s ? s.name : ''),
                        React.createElement("div", { className: "cert-rule" }),
                        React.createElement("p", null, "has successfully completed"),
                        React.createElement("h4", null, s ? s.course : ''),
                        React.createElement("div", { className: "cert-bottom" },
                            React.createElement("span", null, "COURSE ADMINISTRATION"),
                            React.createElement("span", null, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })))),
                    React.createElement("div", { className: "studio-actions" },
                        React.createElement("button", { className: "btn btn-primary", onClick: () => this.downloadCertificate(s) },
                            React.createElement(Icon, { name: "download", size: 17 }),
                            " Download PDF certificate"),
                        React.createElement("button", { className: "btn btn-light", onClick: () => this.setState({ confirmBulk: true }) },
                            React.createElement(Icon, { name: "archive", size: 17 }),
                            " Download all (",
                            eligible.length,
                            ")"))) : React.createElement(Empty, { icon: "award", title: "No certificates ready", description: "Import students or lower the threshold to include eligible students.", action: React.createElement("button", { className: "btn btn-primary", onClick: () => this.pageTo('Import Students') }, "Import students") })),
            React.createElement("aside", { className: "studio-right" },
                React.createElement("div", { className: "panel side-note" },
                    React.createElement(Icon, { name: "sparkle", size: 24 }),
                    React.createElement("h3", null, "Personalized by default."),
                    React.createElement("p", null, "Every certificate contains a student's name, their course, and an issuance date. PDFs are generated within your browser.")),
                React.createElement("div", { className: "panel side-note" },
                    React.createElement(Icon, { name: "shield", size: 24 }),
                    React.createElement("h3", null, "Always in your control."),
                    React.createElement("p", null, "No certificate is automatically emailed. Downloads are created only when you choose to generate them."))),
            this.state.confirmBulk ? React.createElement("div", { className: "modal-backdrop", role: "presentation", onClick: () => this.setState({ confirmBulk: false }) },
                React.createElement("div", { className: "modal-card", role: "dialog", "aria-modal": "true", "aria-label": "Confirm batch download", onClick: (e) => e.stopPropagation() },
                    React.createElement("div", { className: "modal-icon" },
                        React.createElement(Icon, { name: "archive", size: 25 })),
                    React.createElement("h3", null,
                        "Download ",
                        eligible.length,
                        " certificates?"),
                    React.createElement("p", null, "CertifyFlow will generate a PDF for each passing student and package the files into a ZIP. The files remain on your device."),
                    React.createElement("div", { className: "modal-actions" },
                        React.createElement("button", { className: "btn btn-light", onClick: () => this.setState({ confirmBulk: false }) }, "Cancel"),
                        React.createElement("button", { className: "btn btn-primary", onClick: () => this.downloadAll() }, "Generate ZIP")))) : null);
    }
    renderNotifications() {
        const student = this.getStudent();
        const candidates = this.state.students.filter(s => this.state.notificationsFilter === 'all' || (this.state.notificationsFilter === 'passed' ? this.passed(s) : !this.passed(s)));
        const selected = candidates.find(s => s.id === this.state.selected) || candidates[0];
        const m = selected ? CertifyCore.messageFor(selected, this.state.threshold) : null;
        return React.createElement("div", null,
            React.createElement("div", { className: "notice-inline" },
                React.createElement(Icon, { name: "shield", size: 20 }),
                React.createElement("div", null,
                    React.createElement("b", null, "Safe preview mode is on."),
                    " These are drafts only. The app has no email sending credentials or email delivery connection.")),
            React.createElement("div", { className: "messages-layout" },
                React.createElement("section", { className: "panel inbox-panel" },
                    React.createElement("div", { className: "panel-heading" },
                        React.createElement("div", null,
                            React.createElement("h2", null, "Student notifications"),
                            React.createElement("p", null,
                                this.state.students.length,
                                " draft messages"))),
                    React.createElement("div", { className: "segments wide" }, ['all', 'passed', 'retake'].map(f => React.createElement("button", { key: f, onClick: () => this.setState({ notificationsFilter: f }), className: this.state.notificationsFilter === f ? 'active' : '' }, f === 'all' ? 'All' : f === 'passed' ? 'Pass' : 'Retake'))),
                    React.createElement("div", { className: "message-list" }, candidates.map(s => React.createElement("button", { key: s.id, className: 'message-row ' + (selected?.id === s.id ? 'selected' : ''), onClick: () => this.setState({ selected: s.id }) },
                        React.createElement("span", { className: "message-avatar" }, s.name.split(' ').map(x => x[0]).slice(0, 2).join('')),
                        React.createElement("span", null,
                            React.createElement("strong", null, s.name),
                            React.createElement("small", null, s.email),
                            React.createElement("small", { className: "message-subject" }, CertifyCore.messageFor(s, this.state.threshold).subject)),
                        React.createElement("span", { className: 'message-dot ' + (this.passed(s) ? 'pass' : 'fail') }))))),
                React.createElement("section", { className: "panel draft-panel" }, selected && m ? React.createElement("div", null,
                    React.createElement("div", { className: "draft-header" },
                        React.createElement("div", null,
                            React.createElement("span", { className: "eyebrow" }, "PERSONALIZED EMAIL DRAFT"),
                            React.createElement("h2", null, this.passed(selected) ? 'Completion notification' : 'Retake notification')),
                        this.passed(selected) ? React.createElement(Badge, { type: "pass" }, "Passed") : React.createElement(Badge, { type: "retake" }, "Retake")),
                    React.createElement("div", { className: "draft-line" },
                        React.createElement("label", null, "To"),
                        React.createElement("span", null, selected.email)),
                    React.createElement("div", { className: "draft-line" },
                        React.createElement("label", null, "Subject"),
                        React.createElement("span", null,
                            React.createElement("strong", null, m.subject))),
                    React.createElement("div", { className: "draft-content" }, m.body),
                    React.createElement("div", { className: "draft-actions" },
                        React.createElement("button", { className: "btn btn-primary", onClick: () => this.copyMessage(selected) },
                            React.createElement(Icon, { name: "copy", size: 17 }),
                            " Copy draft"),
                        React.createElement("button", { className: "btn btn-light", onClick: () => this.exportDrafts() },
                            React.createElement(Icon, { name: "download", size: 17 }),
                            " Export all drafts"),
                        React.createElement("button", { className: "btn btn-disabled", disabled: true, title: "Real email delivery is intentionally disabled" },
                            React.createElement(Icon, { name: "send", size: 17 }),
                            " Send emails (disabled)"))) : React.createElement(Empty, { icon: "mail", title: "No drafts in this category", description: "Switch the filter to see other student messages." }))));
    }
    renderActivity() { return React.createElement("div", { className: "panel activity-panel" },
        React.createElement("div", { className: "section-kicker" }, "DEMO SESSION"),
        React.createElement("h2", null, "Your activity, at a glance."),
        React.createElement("p", { className: "muted" }, "Recorded locally during this browser session. Refreshing the page resets this history."),
        React.createElement("div", { className: "activity-list" }, this.state.activity.map(a => React.createElement("div", { key: a.id, className: "activity-row" },
            React.createElement("span", { className: "activity-icon" },
                React.createElement(Icon, { name: a.icon, size: 18 })),
            React.createElement("div", null,
                React.createElement("strong", null, a.title),
                React.createElement("small", null, a.detail)),
            React.createElement("time", null, a.time))))); }
    render() { return React.createElement("div", { className: "app-shell" },
        React.createElement("aside", { className: 'sidebar ' + (this.state.mobileMenu ? 'mobile-open' : '') },
            React.createElement("div", { className: "brand" },
                React.createElement("div", { className: "brand-mark" }, "C"),
                React.createElement("strong", null,
                    "Certify",
                    React.createElement("span", null, "Flow"))),
            React.createElement("nav", { className: "nav" }, NAV.map(item => React.createElement("button", { key: item.name, className: 'nav-link ' + (this.state.page === item.name ? 'current' : ''), onClick: () => this.pageTo(item.name) },
                React.createElement(Icon, { name: item.icon, size: 21 }),
                item.name))),
            React.createElement("div", { className: "sidebar-bottom" },
                React.createElement(Icon, { name: "graduation", size: 29 }),
                React.createElement("h3", null, "Automate your course certification"),
                React.createElement("p", null, "Generate certificates and prepare personalized notifications in seconds."),
                React.createElement("span", { className: "demo-label" },
                    React.createElement("span", null),
                    " Demo mode"))),
        React.createElement("main", { className: "main-content" },
            this.renderTop(),
            React.createElement("div", { className: "content-area" },
                this.state.page === 'Dashboard' ? this.renderDashboard() : this.state.page === 'Import Students' ? this.renderImport() : this.state.page === 'Results' ? this.renderResults() : this.state.page === 'Certificates' ? this.renderCertificates() : this.state.page === 'Notifications' ? this.renderNotifications() : this.renderActivity(),
                React.createElement("footer", { className: "footer" },
                    "CertifyFlow ",
                    React.createElement("span", null, "\u2022"),
                    " Portfolio prototype reconstructed from a 2025 NCAIR internship project ",
                    React.createElement("span", null, "\u2022"),
                    " Fictional student data ",
                    React.createElement("span", null, "\u2022"),
                    " No email sending"))),
        this.state.mobileMenu ? React.createElement("div", { className: "nav-scrim", onClick: () => this.setState({ mobileMenu: false }) }) : null,
        this.state.toast ? React.createElement("div", { className: "toast", role: "status" },
            React.createElement(Icon, { name: "check", size: 18 }),
            this.state.toast,
            React.createElement("button", { "aria-label": "Dismiss notification", onClick: () => this.setState({ toast: '' }) },
                React.createElement(Icon, { name: "x", size: 14 }))) : null); }
}
ReactDOM.render(React.createElement(App, null), document.getElementById('root'));
