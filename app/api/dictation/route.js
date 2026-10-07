import OpenAI from "openai";
export const runtime="nodejs";
export async function POST(req){
 try{
  if(!process.env.OPENAI_API_KEY)return Response.json({error:"OPENAI_API_KEY fehlt in Vercel."},{status:500});
  const fd=await req.formData();const audio=fd.get("audio");const currentRoom=String(fd.get("currentRoom")||"");const nextInv=Number(fd.get("nextInv")||1);
  if(!audio)return Response.json({error:"Keine Audiodatei erhalten."},{status:400});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const tr=await client.audio.transcriptions.create({file:audio,model:"gpt-4o-mini-transcribe",language:"de"});
  const prompt=`Du wandelst ein deutsches Inventar-Diktat in Datensätze für eine Insolvenz-Inventarliste um.
Aktueller Raum vor Beginn: ${currentRoom||"nicht angegeben"}. Nächste Inventarnummer: ${nextInv}.
Regeln:
- Erkenne jede diktierte Inventarposition einzeln.
- Ein genannter Raum gilt für alle folgenden Positionen, bis ein neuer Raum genannt wird.
- Wenn eine Inventarnummer ausdrücklich diktiert wird, verwende sie, sonst fortlaufend ab ${nextInv}.
- Bezeichnung in Gutachtenform: Gegenstandsart zuerst, dann Hersteller, Modell/Typ, Nr./Seriennummer, Baujahr und weitere sichere Angaben.
- Sammelpositionen wie Büroraumausstattung bleiben eine Position.
- Erfinde keine Angaben.
- Anzahl standardmäßig 1.
Antworte ausschließlich als JSON {"items":[{"invNr":"","designation":"","quantity":"1","room":"","notes":""}]}.
Diktat:
${tr.text}`;
  const r=await client.responses.create({model:"gpt-5.4-mini",input:prompt});
  const txt=r.output_text.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,"");
  const parsed=JSON.parse(txt);return Response.json({transcript:tr.text,items:parsed.items||[]});
 }catch(e){return Response.json({error:e.message||"Diktat konnte nicht verarbeitet werden."},{status:500})}
}