/** Offline PDF and ZIP generation. PDFs use high-resolution raster certificate art. */
namespace CertifyPDF {
  function text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, size: number, color: string, weight: string = '400', font: string = 'Arial, sans-serif') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText(str, x, y);
  }

  export function makeCertificateCanvas(name: string, course: string, issued: string): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 990;
    const ctx = c.getContext('2d')!;
    const W = c.width, H = c.height;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f7f5ff';ctx.beginPath();ctx.moveTo(W,0);ctx.lineTo(W,235);ctx.lineTo(W-310,0);ctx.closePath();ctx.fill();
    ctx.fillStyle = '#f2f0ff';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,H-245);ctx.lineTo(335,H);ctx.closePath();ctx.fill();
    ctx.strokeStyle = '#4e36b5'; ctx.lineWidth = 14; ctx.strokeRect(52, 50, W-104, H-100);
    ctx.strokeStyle = '#dfb96f'; ctx.lineWidth = 3;ctx.strokeRect(78, 76, W-156, H-152);
    ctx.fillStyle = '#4e36b5'; ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(425,0);ctx.lineTo(0,260);ctx.fill();
    ctx.fillStyle = '#a38cff'; ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(180,0);ctx.lineTo(0,110);ctx.fill();
    ctx.fillStyle = '#4e36b5'; ctx.beginPath();ctx.moveTo(W,H);ctx.lineTo(W-425,H);ctx.lineTo(W,H-260);ctx.fill();
    text(ctx,'✦',W/2,202,65,'#be984d','400','Georgia, serif');
    text(ctx,'CERTIFICATE OF COMPLETION',W/2,288,53,'#202044','700');
    text(ctx,'THIS CERTIFIES THAT',W/2,370,20,'#78748f','600');
    const displayName = name.length>28 ? name.slice(0,27)+'…':name;
    const nameSize = displayName.length>19 ? 59:74;
    text(ctx,displayName,W/2,485,nameSize,'#39267e','700','Georgia, serif');
    ctx.strokeStyle='#d8caef';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2-350,518);ctx.lineTo(W/2+350,518);ctx.stroke();
    text(ctx,'has successfully completed',W/2,585,25,'#69617d');
    const displayCourse = course.length>44 ? course.slice(0,43)+'…': course;
    const courseSize = displayCourse.length>29 ? 37:48;
    text(ctx,displayCourse,W/2,657,courseSize,'#2a2850','700');
    text(ctx,'Presented in recognition of commitment and achievement',W/2,727,22,'#79738b');
    ctx.strokeStyle='#c4b7e7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(270,850);ctx.lineTo(570,850);ctx.moveTo(830,850);ctx.lineTo(1130,850);ctx.stroke();
    text(ctx,'COURSE ADMINISTRATION',420,878,19,'#777189','600');
    text(ctx,issued,980,878,19,'#777189','600');
    return c;
  }

  function encode(s: string): Uint8Array { return new TextEncoder().encode(s); }
  function concat(chunks: Uint8Array[]): Uint8Array { const length=chunks.reduce((a,c)=>a+c.length,0);const all=new Uint8Array(length);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return all; }
  export function toCertificatePDF(name: string, course: string, issued: string): Uint8Array {
    const canvas = makeCertificateCanvas(name,course,issued);
    const b64=canvas.toDataURL('image/jpeg',0.9).split(',')[1];
    const raw=atob(b64); const jpg=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) jpg[i]=raw.charCodeAt(i);
    const pieces: Uint8Array[]=[]; let position=0; const offsets:number[]=[0];
    function put(s:string|Uint8Array){const bytes=typeof s==='string'?encode(s):s;pieces.push(bytes);position+=bytes.length;}
    function obj(id:number, prefix:string, bytes?:Uint8Array, suffix?:string) {
      offsets[id]=position;put(`${id} 0 obj\n${prefix}`);
      if(bytes)put(bytes);
      if(suffix)put(suffix);
      put('\nendobj\n');
    }
    put('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    obj(4,`<< /Type /XObject /Subtype /Image /Width 1400 /Height 990 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,jpg,'\nendstream');
    const cmd=encode('q 842 0 0 595 0 0 cm /Im0 Do Q\n');
    obj(5,`<< /Length ${cmd.length} >>\nstream\n`,cmd,'endstream');
    const xref=position;
    put('xref\n0 6\n0000000000 65535 f \n');
    for(let i=1;i<=5;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return concat(pieces);
  }

  function crc32(data:Uint8Array):number{
    let crc=0xffffffff;
    for(let i=0;i<data.length;i++) {crc^=data[i];for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    return (crc^0xffffffff)>>>0;
  }
  export function makeZip(items:{name:string,data:Uint8Array}[]):Uint8Array{
    const out:Uint8Array[]=[];const central:Uint8Array[]=[];
    let offset=0;const now=new Date();const dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(Math.floor(now.getSeconds()/2));const dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    function entry(name:string,data:Uint8Array){
      const file=encode(name),crc=crc32(data),size=data.length;
      const header=new Uint8Array(30+file.length),h=new DataView(header.buffer);
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(8,0,true);h.setUint16(10,dosTime,true);h.setUint16(12,dosDate,true);h.setUint32(14,crc,true);h.setUint32(18,size,true);h.setUint32(22,size,true);h.setUint16(26,file.length,true);header.set(file,30);
      out.push(header,data);
      const c=new Uint8Array(46+file.length),v=new DataView(c.buffer);
      v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(10,0,true);v.setUint16(12,dosTime,true);v.setUint16(14,dosDate,true);v.setUint32(16,crc,true);v.setUint32(20,size,true);v.setUint32(24,size,true);v.setUint16(28,file.length,true);v.setUint32(42,offset,true);c.set(file,46);central.push(c);
      offset+=header.length+data.length;
    }
    for(const item of items)entry(item.name,item.data);
    const center=concat(central),end=new Uint8Array(22),view=new DataView(end.buffer);
    view.setUint32(0,0x06054b50,true);view.setUint16(8,items.length,true);view.setUint16(10,items.length,true);view.setUint32(12,center.length,true);view.setUint32(16,offset,true);
    return concat([...out,center,end]);
  }
  export function save(data:Uint8Array | string,name:string,type:string) {
    const blob=new Blob([data as BlobPart],{type}); const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a'); anchor.href=url;anchor.download=name;
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  export function filename(value:string):string{return value.replace(/[^a-z0-9_\-]+/gi,'_').slice(0,52).replace(/^_+|_+$/g,'')||'student';}
}
