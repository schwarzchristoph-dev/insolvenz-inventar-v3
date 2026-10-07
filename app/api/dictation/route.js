import OpenAI,{toFile} from "openai";
import ffmpegStatic from "ffmpeg-static";
import {spawn} from "child_process";
import {writeFile,readFile,unlink,chmod} from "fs/promises";
import path from "path";
export const runtime="nodejs";export const maxDuration=60;
async function findFfmpeg(){
 const candidates=[ffmpegStatic,process.env.FFMPEG_PATH,"/var/task/node_modules/ffmpeg-static/ffmpeg","/var/task/node_modules/.bin/ffmpeg"].filter(Boolean);
 for(const p of candidates){try{await chmod(p,0o755);return p}catch{}}
 throw new Error("DSS-Konverter ist auf dem Server nicht verfügbar. Bitte Diktat als MP3, M4A oder WAV hochladen.");
}
async function convertDss(file){
 const base="/tmp/dict-"+crypto.randomUUID(),input=base+".dss",output=base+".wav";await writeFile(input,Buffer.from(await file.arrayBuffer()));
 try{const bin=await findFfmpeg();await new Promise((resolve,reject)=>{const p=spawn(bin,["-y","-i",input,"-ac","1","-ar","16000","-c:a","pcm_s16le",output]);let err="";p.stderr.on("data",d=>err+=d);p.on("error",reject);p.on("close",c=>c===0?resolve():reject(new Error("DSS-Datei konnte nicht dekodiert werden. "+err.slice(-350))))});const b=await readFile(output);return await toFile(b,path.parse(file.name).name+".wav",{type:"audio/wav"});}
 finally{await unlink(input).catch(()=>{});await unlink(output).catch(()=>{})}
}
export async function POST(req){try{
 if(!process.env.OPENAI_API_KEY)return Response.json({error:"OPENAI_API_KEY fehlt in Vercel."},{status:500});
 const fd=await req.formData();let audio=fd.get("audio");const currentRoom=String(fd.get("currentRoom")||"");const nextInv=Number(fd.get("nextInv")||1);if(!audio)return Response.json({error:"Keine Audiodatei erhalten."},{status:400});
 if(String(audio.name||"").toLowerCase().endsWith(".dss"))audio=await convertDss(audio);
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const tr=await client.audio.transcriptions.create({file:audio,model:"gpt-4o-mini-transcribe",language:"de"});
 const prompt=`Du wandelst ein deutsches Inventar-Diktat in Datensätze für eine Insolvenz-Inventarliste um. Aktueller Raum: ${currentRoom||"nicht angegeben"}. Nächste Inventarnummer: ${nextInv}.
Erkenne jede Position einzeln. Ein Raum gilt weiter bis ein neuer genannt wird. Verwende diktierte Inventarnummern, sonst fortlaufend. Bezeichnung: Gegenstandsart, Hersteller, Modell/Typ, Nr./Seriennummer, Baujahr, weitere sichere Angaben. Sammelpositionen bleiben eine Position. Nichts erfinden. Anzahl standardmäßig 1.
Antworte nur JSON {"items":[{"invNr":"","designation":"","quantity":"1","room":"","notes":""}]}. Diktat: ${tr.text}`;
 const r=await client.responses.create({model:"gpt-5.4-mini",input:prompt});const parsed=JSON.parse(r.output_text.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,""));return Response.json({transcript:tr.text,items:parsed.items||[]});
}catch(e){return Response.json({error:e.message||"Diktat konnte nicht verarbeitet werden."},{status:500})}}