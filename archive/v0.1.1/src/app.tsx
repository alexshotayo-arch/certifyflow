type Page = 'Dashboard' | 'Import Students' | 'Results' | 'Certificates' | 'Notifications' | 'Activity';
type StatusFilter = 'all' | 'passed' | 'retake';
type Activity = {id:number;time:string;title:string;detail:string;icon:string};
type AppState = {
  page:Page; students:CertifyCore.Student[]; source:string; threshold:number; defaultCourse:string;
  issues:CertifyCore.ParseIssue[]; filter:StatusFilter; search:string; selected:string;
  notificationsFilter:StatusFilter; activity:Activity[]; toast:string; uploadError:string;
  dragActive:boolean; mobileMenu:boolean; issueExpanded:boolean; confirmBulk:boolean;
};

const NAV: {name:Page;icon:string}[]=[
  {name:'Dashboard',icon:'grid'}, {name:'Import Students',icon:'upload'}, {name:'Results',icon:'bars'},
  {name:'Certificates',icon:'award'}, {name:'Notifications',icon:'mail'}, {name:'Activity',icon:'clock'}
];
function Icon(p:{name:string; size?:number; className?:string}) {
  return <svg className={'icon '+(p.className||'')} width={p.size||19} height={p.size||19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><use xlinkHref={'#i-'+p.name}/></svg>;
}
function Badge(p:{type:'pass'|'retake'|'ready'|'draft'|'neutral';children?:any}) {
  const mark=p.type==='pass'?'check':p.type==='retake'?'x':p.type==='ready'?'mail':'file';
  return <span className={'badge badge-'+p.type}><Icon name={mark} size={13}/>{p.children}</span>;
}
function Empty(p:{icon:string;title:string;description:string;action?:any}) {
  return <div className="empty"><div className="empty-icon"><Icon name={p.icon} size={30}/></div><h3>{p.title}</h3><p>{p.description}</p>{p.action}</div>;
}

class App extends React.Component {
  state:AppState;
  private fileInput:HTMLInputElement|null=null;
  private noticeTimeout:number|undefined;
  constructor(props:any){
    super(props);
    this.state={page:'Dashboard',students:CertifyCore.demoStudents.map(s=>({...s})),source:'fictional demo cohort',threshold:50,defaultCourse:'Python Foundations',issues:[],filter:'all',search:'',selected:'demo-1',notificationsFilter:'all',activity:[{id:1,time:'Demo session',title:'Sample cohort loaded',detail:'Fictional student records are ready for review',icon:'file'}],toast:'',uploadError:'',dragActive:false,mobileMenu:false,issueExpanded:false,confirmBulk:false};
  }
  getStudent(){return this.state.students.find(s=>s.id===this.state.selected) || this.state.students[0];}
  passed(s:CertifyCore.Student){return s.score>=this.state.threshold;}
  getPassed(){return this.state.students.filter(s=>this.passed(s));}
  log(title:string,detail:string,icon:string='check'){
    this.setState((before:AppState)=>({activity:[{id:Date.now()+Math.random(),time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),title,detail,icon},...before.activity].slice(0,35)}));
  }
  notify(text:string){this.setState({toast:text});if(this.noticeTimeout)window.clearTimeout(this.noticeTimeout);this.noticeTimeout=window.setTimeout(()=>this.setState({toast:''}),4800);}
  pageTo(page:Page){this.setState({page,mobileMenu:false,search:'',filter:'all'});window.scrollTo(0,0);}
  uploadFail(message:string){
    this.setState({uploadError:message,page:'Import Students',issueExpanded:true,dragActive:false});
    this.notify(message);
  }
  onFiles(files:FileList|File[]|null){
    this.setState({dragActive:false});if(!files||!files.length)return;
    const file=files[0];
    if(!/\.csv$/i.test(file.name)){
      this.uploadFail(/\.xlsx?$/i.test(file.name) ?
        'That is an Excel workbook. Open it in Excel, choose File > Save As > CSV UTF-8 (.csv), and upload the saved CSV file.' :
        'Unsupported file. Choose a .csv file, or download the sample CSV below to see the required format.');
      return;
    }
    if(file.size>2*1024*1024){this.uploadFail('CSV files must be smaller than 2 MB in this demo.');return;}
    const reader=new FileReader();
    reader.onload=()=>{
      try {
        const result=CertifyCore.parseStudentCSV(String(reader.result||''),this.state.defaultCourse);
        if(!result.students.length){this.setState({issues:result.issues,issueExpanded:true});this.uploadFail('No valid student records found. Check the CSV columns and row errors below.');return;}
        this.setState({students:result.students,source:file.name,issues:result.issues,selected:result.students[0].id,filter:'all',search:'',page:'Results',uploadError:'',issueExpanded:result.issues.length>0,confirmBulk:false});
        this.notify(`${result.students.length} students imported${result.issues.length?' • '+result.issues.length+' row(s) skipped':''}.`);
        this.log('CSV imported',`${result.students.length} valid records from ${file.name} · ${result.issues.length} rows skipped`,'upload');
      } catch(err){this.uploadFail(err instanceof Error?err.message:'Could not read the CSV file.');}
    };
    reader.onerror=()=>this.uploadFail('The browser could not read that file. Try saving a fresh CSV UTF-8 copy.');reader.readAsText(file);
    if(this.fileInput)this.fileInput.value='';
  }
  thresholdChange(raw:string){const n=Number(raw);if(raw===''||!Number.isFinite(n)||n<0||n>100)return;this.setState({threshold:n});}
  downloadSample(){CertifyPDF.save(CertifyCore.sampleCSV(),'certifyflow_sample_students.csv','text/csv;charset=utf-8');this.log('Sample CSV exported','Downloaded fictional sample student data','download');}
  exportResults(){
    const rows:Array<Array<string|number>>=[['Name','Email','Course','Score','Passing Threshold','Status','Draft Subject']];
    this.state.students.forEach(s=>rows.push([s.name,s.email,s.course,s.score,this.state.threshold,this.passed(s)?'Passed':'Needs retake',CertifyCore.messageFor(s,this.state.threshold).subject]));
    CertifyPDF.save(CertifyCore.toCSV(rows),'certifyflow_results.csv','text/csv;charset=utf-8');this.log('Results exported',`${this.state.students.length} reviewed student results`,'download');
    this.notify('Results CSV downloaded.');
  }
  downloadCertificate(student:CertifyCore.Student){
    if(!this.passed(student)){this.notify('Only students who meet the passing threshold receive certificates.');return;}
    const bytes=CertifyPDF.toCertificatePDF(student.name,student.course,new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}));
    CertifyPDF.save(bytes,CertifyPDF.filename(student.name)+'_certificate.pdf','application/pdf');
    this.log('Certificate downloaded',`${student.name} · ${student.course}`,'award');this.notify(`Certificate downloaded for ${student.name}.`);
  }
  downloadAll(){
    const selected=this.getPassed();if(!selected.length){this.notify('No passing students to generate certificates for.');return;}
    if(selected.length>150){this.notify('This demo supports up to 150 certificates per batch.');return;}
    const date=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
    const used=new Set<string>();
    const items=selected.map((s)=>{
      let file=CertifyPDF.filename(s.name)+'_'+CertifyPDF.filename(s.course),base=file,i=2;
      while(used.has(file)){file=base+'_'+i;i++;}used.add(file);
      return {name:file+'_certificate.pdf',data:CertifyPDF.toCertificatePDF(s.name,s.course,date)};
    });
    CertifyPDF.save(CertifyPDF.makeZip(items),'certifyflow_certificates.zip','application/zip');
    this.setState({confirmBulk:false});this.log('Certificate batch downloaded',`${selected.length} personalized PDFs packaged in a ZIP`,'download');
    this.notify(`${selected.length} PDF certificates downloaded in a ZIP file.`);
  }
  exportDrafts(){
    const rows:Array<Array<string|number>>=[['Name','Email','Course','Outcome','Subject','Draft Email Body']];
    this.state.students.forEach(s=>{const m=CertifyCore.messageFor(s,this.state.threshold);rows.push([s.name,s.email,s.course,this.passed(s)?'Passed':'Needs retake',m.subject,m.body]);});
    CertifyPDF.save(CertifyCore.toCSV(rows),'certifyflow_email_drafts.csv','text/csv;charset=utf-8');
    this.notify('Email drafts exported. Nothing has been sent.');this.log('Email drafts downloaded',`${this.state.students.length} simulated notifications · no delivery`,'mail');
  }
  async copyMessage(student:CertifyCore.Student){
    const m=CertifyCore.messageFor(student,this.state.threshold);
    const content=`To: ${student.email}\nSubject: ${m.subject}\n\n${m.body}`;
    try {await navigator.clipboard.writeText(content);this.notify('Email draft copied. Nothing has been sent.');}
    catch {this.notify('Clipboard not available. You can select and copy the draft below.');}
  }
  studentList(filter:StatusFilter=this.state.filter){
    return this.state.students.filter(s=>{
      const matches=filter==='all'||(filter==='passed'?this.passed(s):!this.passed(s));
      const q=this.state.search.trim().toLowerCase();
      return matches&&(!q||[s.name,s.email,s.course,String(s.score)].some(t=>t.toLowerCase().includes(q)));
    });
  }
  renderTop(){
    const titles:{[k:string]:[string,string]}={
      'Dashboard':['Course overview','From results to recognition, in one flow.'],
      'Import Students':['Import students','Upload, validate, and prepare your next cohort.'],
      'Results':['Student results','Review every score before generating certificates.'],
      'Certificates':['Certificate studio','Create something worth celebrating.'],
      'Notifications':['Notification drafts','Personalized messages, with no accidental sends.'],
      'Activity':['Activity history','A record of actions during this demo session.']
    };
    const labels=titles[this.state.page];
    return <header className="topbar"><div className="heading-group"><button className="mobile-nav-toggle" onClick={()=>this.setState({mobileMenu:!this.state.mobileMenu})} aria-label="Toggle menu"><Icon name="menu"/></button><div><div className="page-eyebrow">WORKSPACE / CERTIFICATION</div><h1>{labels[0]} <span className="heading-spark">✳</span></h1><p>{labels[1]}</p></div></div><div className="top-actions"><span className="workspace-chip"><Icon name="layers" size={18}/> Demo workspace <Icon name="chevron" size={14}/></span><span className="top-divider"/><button className="notification-bell" onClick={()=>this.pageTo('Notifications')} title="View notification drafts"><Icon name="bell" size={22}/><i/></button><span className="avatar">CF</span></div></header>;
  }
  renderStats(){
    const all=this.state.students.length, pass=this.getPassed().length,fail=all-pass;
    const stats=[
      {name:'Students imported',value:all,icon:'users',kind:'violet',sub:'Ready for evaluation'},
      {name:'Passed',value:pass,icon:'check',kind:'green',sub:all?`${Math.round(pass/all*100)}% of this cohort`:'No records yet'},
      {name:'Needs retake',value:fail,icon:'x',kind:'red',sub:all?`${Math.round(fail/all*100)}% of this cohort`:'No records yet'},
      {name:'Certificates ready',value:pass,icon:'award',kind:'purple',sub:'Available as PDF'}
    ];
    return <div className="stats-grid">{stats.map(s=><div key={s.name} className="stat-card"><div className="stat-head"><span className={'stat-icon '+s.kind}><Icon name={s.icon} size={24}/></span><div><div className="stat-name">{s.name}</div><div className="stat-value">{s.value}</div></div></div><div className="stat-footer"><span className="stat-sub">{s.sub}</span><span className={'stat-squiggle '+s.kind}><svg viewBox="0 0 90 30"><path d="M2 26 C16 25 22 7 34 12 S55 27 69 12 S80 8 88 2"/></svg></span></div></div>)}</div>;
  }
  renderUploadZone(compact:boolean=false){return <div className={'upload-zone '+(compact?'upload-zone-compact ':'')+(this.state.dragActive?'is-dragging':'')} onDragOver={(ev:any)=>{ev.preventDefault();this.setState({dragActive:true});}} onDragLeave={(ev:any)=>{ev.preventDefault();this.setState({dragActive:false});}} onDrop={(ev:any)=>{ev.preventDefault();this.onFiles(ev.dataTransfer.files);}}>
    <div className="csv-file-icon"><Icon name="file" size={31}/><span>CSV</span></div><strong>Drag and drop your CSV file here</strong><small>or click below to choose a file</small>
    <button className="btn btn-primary" onClick={()=>this.fileInput&&this.fileInput.click()}><Icon name="upload" size={17}/> Upload CSV</button>
    <label className="native-upload-label">Or browse files directly
      <input aria-label="Choose CSV file directly" className="native-file-input" ref={(x:HTMLInputElement)=>this.fileInput=x} type="file" accept=".csv,text/csv" onChange={(e:any)=>this.onFiles(e.target.files)}/>
    </label>
  </div>;}
  renderPipeline(){return <div className="process-list">{[
    ['Import','Upload student results (CSV)'],['Review','Check scores and outcomes'],['Generate','Create personalized certificates'],['Notify','Prepare email notifications']
  ].map((n,i)=><div className="process-step" key={i}><span className={'step-number '+(i===0?'step-active':'')}>{i+1}</span><span><b>{n[0]}</b><small>{n[1]}</small></span></div>)}</div>;}
  renderIntro(){return <section className="hero-card"><div className="hero-copy"><span className="mini-hero-label">ONE UPLOAD. ALL DONE.</span><h2>Ready to process<br/>your next cohort?</h2><p>Upload a CSV of student results, set the passing threshold, and automatically prepare certificates and notifications.</p><div className="hero-arc"/></div>{this.renderUploadZone(true)}{this.renderPipeline()}</section>;}
  renderThreshold(){return <label className="threshold-control"><span>Passing threshold:</span><input aria-label="Passing threshold percent" type="number" min="0" max="100" step="1" value={this.state.threshold} onChange={(e:any)=>this.thresholdChange(e.target.value)}/><b>%</b><Icon name="settings" size={16}/></label>;}
  renderStudentTable(limit?:number){
    const records=this.studentList(),display=typeof limit==='number'?records.slice(0,limit):records.slice(0,75);
    return <div className="table-wrap"><table className="students-table"><thead><tr><th className="col-check">#</th><th>Name</th><th>Course</th><th>Score</th><th>Status</th><th>Notification</th><th className="right">Action</th></tr></thead><tbody>{display.map((s,i)=><tr key={s.id}><td className="number-col">{i+1}</td><td><div className="student-name">{s.name}</div><small className="student-email">{s.email}</small></td><td>{s.course}</td><td><strong>{s.score}%</strong></td><td>{this.passed(s)?<Badge type="pass">Passed</Badge>:<Badge type="retake">Retake</Badge>}</td><td>{this.passed(s)?<Badge type="ready">Certificate ready</Badge>:<Badge type="draft">Email draft</Badge>}</td><td className="right"><button className="icon-action" title="View student" onClick={()=>{this.setState({selected:s.id,page:this.passed(s)?'Certificates':'Notifications'});window.scrollTo(0,0);}}><Icon name="arrow-right" size={17}/></button></td></tr>)}</tbody></table>
    {display.length===0?<Empty icon="search" title="No records found" description="Try a different search or filter."/>:null}
    {records.length>display.length?<p className="table-footer">Showing {display.length} of {records.length} records. Download all results to view the full list.</p>:null}
    </div>;
  }
  renderReview(isDashboard:boolean){return <section className="panel review-panel"><div className="panel-heading"><div className="panel-heading-label"><Icon name="users" size={24}/><div><h2>Student review</h2><p>Review student results, passing status, and notification readiness.</p></div></div>{this.renderThreshold()}</div>
    {!isDashboard?<div className="table-tools"><div className="input-search"><Icon name="search" size={18}/><input placeholder="Search students, email, or course" value={this.state.search} onChange={(e:any)=>this.setState({search:e.target.value})}/></div><div className="segments">{(['all','passed','retake'] as StatusFilter[]).map(f=><button key={f} className={this.state.filter===f?'active':''} onClick={()=>this.setState({filter:f})}>{f==='all'?'All':f==='passed'?'Passed':'Needs retake'}</button>)}</div><button className="btn btn-light" onClick={()=>this.exportResults()}><Icon name="download" size={16}/> Export CSV</button></div>:null}
    {this.renderStudentTable(isDashboard?4:undefined)}
    {isDashboard?<div className="panel-bottom"><span>Showing first 4 records from {this.state.source}</span><button className="text-link" onClick={()=>this.pageTo('Results')}>View all students <Icon name="arrow-right" size={15}/></button></div>:null}
  </section>;}
  renderCertificatePanel(){const s=this.state.students.find(x=>this.passed(x))||this.state.students[0];return <section className="panel certificate-side"><div className="panel-heading"><div className="panel-heading-label"><Icon name="award" size={25}/><div><h2>Certificate preview</h2></div></div></div><p className="preview-explainer">A personalized certificate for students who meet the passing threshold.</p>
    <div className="mini-certificate"><div className="mini-cert-decoration"><span>✦</span></div><small>Certificate of Completion</small><span>This is to certify that</span><strong>{s?s.name:'Student Name'}</strong><span>has successfully completed</span><b>{s?s.course:'Course Name'}</b><i>★</i></div>
    <button className="btn btn-soft w-full" onClick={()=>this.pageTo('Certificates')}><Icon name="external" size={17}/> Open certificate studio</button></section>;
  }
  renderDemoNotice(){return <div className="notice-card"><Icon name="send" size={28}/><div><h3>No emails sent in demo mode</h3><p>Messages are drafted and previewed only. No real recipients will be contacted.</p></div><Icon name="info" className="notice-info" size={17}/></div>;}
  renderDashboard(){return <div>{this.renderStats()}{this.renderIntro()}<div className="bottom-grid"><div>{this.renderReview(true)}</div><aside>{this.renderCertificatePanel()}{this.renderDemoNotice()}</aside></div></div>;}
  renderIssues(){if(!this.state.issues.length)return null;const issues=this.state.issueExpanded?this.state.issues:this.state.issues.slice(0,3);return <div className="issues-panel"><div className="issue-title"><Icon name="alert" size={19}/> {this.state.issues.length} row(s) skipped during import <button onClick={()=>this.setState({issueExpanded:!this.state.issueExpanded})}>{this.state.issueExpanded?'Collapse':'Show all'}</button></div><ul>{issues.map((x,i)=><li key={i}>Row {x.row}: {x.message}</li>)}</ul></div>;}
  renderImport(){return <div className="page-grid"><div className="panel import-main"><div className="section-kicker">STEP 01 / IMPORT</div><h2>Bring your class results together.</h2><p className="muted">Your file stays in this browser session. No records are transmitted to a server.</p><div className="field-row"><label className="field"><span>Default course name</span><input type="text" value={this.state.defaultCourse} maxLength={80} onChange={(e:any)=>this.setState({defaultCourse:e.target.value})}/></label><label className="field"><span>Passing score (%)</span><input type="number" value={this.state.threshold} min={0} max={100} onChange={(e:any)=>this.thresholdChange(e.target.value)}/></label></div>{this.state.uploadError?<div className="upload-error" role="alert"><Icon name="info" size={19}/><span><b>Import could not be completed.</b> {this.state.uploadError}</span><button aria-label="Dismiss upload error" onClick={()=>this.setState({uploadError:''})}>×</button></div>:null}{this.renderUploadZone()}<div className="file-help"><Icon name="shield" size={17}/> Use fictional or permitted student records only. Files are not stored after the page is closed.</div>{this.renderIssues()}</div><aside className="panel import-help"><span className="eyebrow">CSV FORMAT</span><h3>Simple, flexible imports.</h3><p>Use a CSV file with one row per student. These columns are supported:</p><div className="code-card">Name, Email, Course, Score<br/>Avery Chen, avery@example.com,<br/>Python Foundations, 91</div><div className="format-list"><span><Icon name="check" size={16}/> Name, Email, Score required</span><span><Icon name="check" size={16}/> Course column optional</span><span><Icon name="check" size={16}/> Quoted values supported</span><span><Icon name="check" size={16}/> Legacy MetricNumber ignored</span></div><button className="btn btn-light w-full" onClick={()=>this.downloadSample()}><Icon name="download" size={17}/> Download sample CSV</button></aside></div>;}
  renderResults(){return <div><div className="inline-stats"><span><b>{this.state.students.length}</b> imported</span><span><b>{this.getPassed().length}</b> passed</span><span><b>{this.state.students.length-this.getPassed().length}</b> need retake</span><span>Source: <strong>{this.state.source}</strong></span></div>{this.renderIssues()}{this.renderReview(false)}<div className="hint-footer"><Icon name="info" size={17}/> Changing the threshold updates every result and draft immediately. Nothing is sent automatically.</div></div>;}
  renderCertificates(){
    const eligible=this.getPassed();const active=this.getStudent();const s=(active&&this.passed(active))?active:eligible[0];
    return <div className="studio-layout"><section className="panel studio-main"><div className="section-kicker">CERTIFICATE STUDIO</div><div className="panel-heading"><div><h2>Celebrate every achievement.</h2><p>Generate personalized PDF certificates using the results you've approved.</p></div><Badge type="neutral">Local generation</Badge></div>
      {eligible.length?<div><div className="field-row"><label className="field"><span>Select student</span><select value={s?s.id:''} onChange={(e:any)=>this.setState({selected:e.target.value})}>{eligible.map(st=><option key={st.id} value={st.id}>{st.name} · {st.course}</option>)}</select></label><div className="studio-count"><small>Eligible students</small><strong>{eligible.length}</strong></div></div><div className="large-cert"><div className="large-corner"/><div className="cert-star">✦</div><h3>CERTIFICATE OF COMPLETION</h3><p>THIS IS TO CERTIFY THAT</p><div className="cert-student">{s?s.name:''}</div><div className="cert-rule"/><p>has successfully completed</p><h4>{s?s.course:''}</h4><div className="cert-bottom"><span>COURSE ADMINISTRATION</span><span>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span></div></div><div className="studio-actions"><button className="btn btn-primary" onClick={()=>this.downloadCertificate(s!)}><Icon name="download" size={17}/> Download PDF certificate</button><button className="btn btn-light" onClick={()=>this.setState({confirmBulk:true})}><Icon name="archive" size={17}/> Download all ({eligible.length})</button></div></div>:<Empty icon="award" title="No certificates ready" description="Import students or lower the threshold to include eligible students." action={<button className="btn btn-primary" onClick={()=>this.pageTo('Import Students')}>Import students</button>}/>}
    </section><aside className="studio-right"><div className="panel side-note"><Icon name="sparkle" size={24}/><h3>Personalized by default.</h3><p>Every certificate contains a student's name, their course, and an issuance date. PDFs are generated within your browser.</p></div><div className="panel side-note"><Icon name="shield" size={24}/><h3>Always in your control.</h3><p>No certificate is automatically emailed. Downloads are created only when you choose to generate them.</p></div></aside>
      {this.state.confirmBulk?<div className="modal-backdrop" role="presentation" onClick={()=>this.setState({confirmBulk:false})}><div className="modal-card" role="dialog" aria-modal="true" aria-label="Confirm batch download" onClick={(e:any)=>e.stopPropagation()}><div className="modal-icon"><Icon name="archive" size={25}/></div><h3>Download {eligible.length} certificates?</h3><p>CertifyFlow will generate a PDF for each passing student and package the files into a ZIP. The files remain on your device.</p><div className="modal-actions"><button className="btn btn-light" onClick={()=>this.setState({confirmBulk:false})}>Cancel</button><button className="btn btn-primary" onClick={()=>this.downloadAll()}>Generate ZIP</button></div></div></div>:null}
    </div>;
  }
  renderNotifications(){const student=this.getStudent();const candidates=this.state.students.filter(s=>this.state.notificationsFilter==='all'||(this.state.notificationsFilter==='passed'?this.passed(s):!this.passed(s)));const selected=candidates.find(s=>s.id===this.state.selected)||candidates[0];const m=selected?CertifyCore.messageFor(selected,this.state.threshold):null;
    return <div><div className="notice-inline"><Icon name="shield" size={20}/><div><b>Safe preview mode is on.</b> These are drafts only. The app has no email sending credentials or email delivery connection.</div></div><div className="messages-layout"><section className="panel inbox-panel"><div className="panel-heading"><div><h2>Student notifications</h2><p>{this.state.students.length} draft messages</p></div></div><div className="segments wide">{(['all','passed','retake'] as StatusFilter[]).map(f=><button key={f} onClick={()=>this.setState({notificationsFilter:f})} className={this.state.notificationsFilter===f?'active':''}>{f==='all'?'All':f==='passed'?'Pass':'Retake'}</button>)}</div><div className="message-list">{candidates.map(s=><button key={s.id} className={'message-row '+(selected?.id===s.id?'selected':'')} onClick={()=>this.setState({selected:s.id})}><span className="message-avatar">{s.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><span><strong>{s.name}</strong><small>{s.email}</small><small className="message-subject">{CertifyCore.messageFor(s,this.state.threshold).subject}</small></span><span className={'message-dot '+(this.passed(s)?'pass':'fail')}/></button>)}</div></section><section className="panel draft-panel">{selected&&m?<div><div className="draft-header"><div><span className="eyebrow">PERSONALIZED EMAIL DRAFT</span><h2>{this.passed(selected)?'Completion notification':'Retake notification'}</h2></div>{this.passed(selected)?<Badge type="pass">Passed</Badge>:<Badge type="retake">Retake</Badge>}</div><div className="draft-line"><label>To</label><span>{selected.email}</span></div><div className="draft-line"><label>Subject</label><span><strong>{m.subject}</strong></span></div><div className="draft-content">{m.body}</div><div className="draft-actions"><button className="btn btn-primary" onClick={()=>this.copyMessage(selected)}><Icon name="copy" size={17}/> Copy draft</button><button className="btn btn-light" onClick={()=>this.exportDrafts()}><Icon name="download" size={17}/> Export all drafts</button><button className="btn btn-disabled" disabled title="Real email delivery is intentionally disabled"><Icon name="send" size={17}/> Send emails (disabled)</button></div></div>:<Empty icon="mail" title="No drafts in this category" description="Switch the filter to see other student messages."/>}</section></div></div>;
  }
  renderActivity(){return <div className="panel activity-panel"><div className="section-kicker">DEMO SESSION</div><h2>Your activity, at a glance.</h2><p className="muted">Recorded locally during this browser session. Refreshing the page resets this history.</p><div className="activity-list">{this.state.activity.map(a=><div key={a.id} className="activity-row"><span className="activity-icon"><Icon name={a.icon} size={18}/></span><div><strong>{a.title}</strong><small>{a.detail}</small></div><time>{a.time}</time></div>)}</div></div>;}
  render(){return <div className="app-shell"><aside className={'sidebar '+(this.state.mobileMenu?'mobile-open':'')}><div className="brand"><div className="brand-mark">C</div><strong>Certify<span>Flow</span></strong></div><nav className="nav">{NAV.map(item=><button key={item.name} className={'nav-link '+(this.state.page===item.name?'current':'')} onClick={()=>this.pageTo(item.name)}><Icon name={item.icon} size={21}/>{item.name}</button>)}</nav><div className="sidebar-bottom"><Icon name="graduation" size={29}/><h3>Automate your course certification</h3><p>Generate certificates and prepare personalized notifications in seconds.</p><span className="demo-label"><span/> Demo mode</span></div></aside><main className="main-content">{this.renderTop()}<div className="content-area">{this.state.page==='Dashboard'?this.renderDashboard():this.state.page==='Import Students'?this.renderImport():this.state.page==='Results'?this.renderResults():this.state.page==='Certificates'?this.renderCertificates():this.state.page==='Notifications'?this.renderNotifications():this.renderActivity()}<footer className="footer">CertifyFlow <span>•</span> Portfolio prototype reconstructed from a 2025 NCAIR internship project <span>•</span> Fictional student data <span>•</span> No email sending</footer></div></main>{this.state.mobileMenu?<div className="nav-scrim" onClick={()=>this.setState({mobileMenu:false})}/>:null}{this.state.toast?<div className="toast" role="status"><Icon name="check" size={18}/>{this.state.toast}<button aria-label="Dismiss notification" onClick={()=>this.setState({toast:''})}><Icon name="x" size={14}/></button></div>:null}</div>}
}

ReactDOM.render(<App/>, document.getElementById('root'));
