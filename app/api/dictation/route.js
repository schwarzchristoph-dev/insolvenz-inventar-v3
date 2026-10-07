import OpenAI,{toFile} from "openai";
import {decode,inspect} from "dss-codec";
export const runtime="nodejs";export const maxDuration=60;
function wav(samples,rate){
 const n=samples.length,b=new ArrayBuffer(44+n*2),v=new DataView(b),s=(o,x)=>[...x].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
 s(0,"RIFF");v.setUint32(4,36+n*2,true);s(8,"WAVE");s(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,"data");v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++){const x=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+i*2,x<0?x*32768:x*32767,true)}return new Uint8Array(b)
}
async function decodeDss(file){
 const bytes=new Uint8Array(await file.arrayBuffer());const info=inspect(bytes);
 try{if(info.encryption!=="none")throw new Error("Verschlüsselte DS2-Datei: Passwort-Unterstützung folgt.");const out=decode(bytes);try{return await toFile(wav(out.samples,out.nativeRate),file.name.replace(/\.(dss|ds2)$/i,"")+".wav",{type:"audio/wav"})}finally{out.free()}}finally{info.free()}
}
export async function POST(req){try{
 if(!process.env.OPENAI_API_KEY)return Response.json({error:"OPENAI_API_KEY fehlt in Vercel."},{status:500});
 const fd=await req.formData();let audio=fd.get("audio");const currentRoom=String(fd.get("currentRoom")||"");const nextInv=Number(fd.get("nextInv")||1);if(!audio)return Response.json({error:"Keine Audiodatei erhalten."},{status:400});
 if(/\.(dss|ds2)$/i.test(String(audio.name||"")))audio=await decodeDss(audio);
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const tr=await client.audio.transcriptions.create({file:audio,model:"gpt-4o-mini-transcribe",language:"de"});
 const prompt=`Du wandelst ein deutsches Inventar-Diktat in Datensätze für eine Insolvenz-Inventarliste um. Aktueller Raum: ${currentRoom||"nicht angegeben"}. Nächste Inventarnummer: ${nextInv}.
Erkenne jede Position einzeln. Ein Raum gilt weiter bis ein neuer genannt wird. Verwende diktierte Inventarnummern, sonst fortlaufend. Bezeichnung: Gegenstandsart, Hersteller, Modell/Typ, Nr./Seriennummer, Baujahr, weitere sichere Angaben. Sammelpositionen bleiben eine Position. Nichts erfinden. Anzahl standardmäßig 1.
Antworte nur JSON {"items":[{"invNr":"","designation":"","quantity":"1","room":"","notes":""}]}. Diktat: ${tr.text}`;
 const r=await client.responses.create({model:"gpt-5.4-mini",input:prompt});const parsed=JSON.parse(r.output_text.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,""));return Response.json({transcript:tr.text,items:parsed.items||[]});
}catch(e){return Response.json({error:e.message||"Diktat konnte nicht verarbeitet werden."},{status:500})}}