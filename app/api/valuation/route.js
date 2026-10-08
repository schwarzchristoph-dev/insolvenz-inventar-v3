import OpenAI from "openai";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(req){
 try{
  if(!process.env.OPENAI_API_KEY)return Response.json({error:"OPENAI_API_KEY fehlt in Vercel."},{status:500});
  const {items}=await req.json();
  if(!Array.isArray(items)||items.length===0||items.length>100)return Response.json({error:"Bitte 1 bis 100 Positionen übergeben."},{status:400});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const input=items.map((x,i)=>({index:i,designation:String(x.designation||"").slice(0,1000),notes:String(x.notes||"").slice(0,400),condition:String(x.condition||"")}));
  const prompt=`Bewerte Inventargegenstände für eine deutsche Insolvenz-Inventarisierung, vorsichtig und NETTO in EUR. Fortführungswert: günstigster plausibler Wiederbeschaffungspreis eines vergleichbaren gebrauchten Gegenstands, nicht Neupreis. Liquidationswert: exakt ein Drittel des Fortführungswerts (niedriger Händlereinkaufswert). Niemals Preise, Marktrecherchen, tatsächliche Verkäufe oder Sicherheit vortäuschen. Du hast KEINE Live-Marktdaten. Wenn Hersteller/Typ, Alter, Zustand, Leistungsdaten oder andere für eine seriöse Bewertung wesentliche Informationen fehlen, gib status "Bewertung prüfen", fort=null, liqui=null. Nur bei ausreichend eindeutigen Angaben konservativ schätzen, status "Schätzwert", und kurze Begründung angeben. Beträge als Zahlen mit höchstens zwei Nachkommastellen. Antwort ausschließlich JSON im Format {"results":[{"index":0,"status":"Schätzwert","fort":300,"liqui":100,"reason":"..."}]}. Jeder index genau einmal. Eingaben: ${JSON.stringify(input)}`;
  const r=await client.responses.create({model:"gpt-5.4-mini",input:prompt});
  const data=JSON.parse(r.output_text.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,""));
  const results=(data.results||[]).map(x=>{const fort=Number(x.fort);const valid=x.status==="Schätzwert"&&x.fort!==null&&Number.isFinite(fort)&&fort>0;return {index:x.index,status:valid?"Schätzwert":"Bewertung prüfen",fort:valid?Math.round(fort*100)/100:null,liqui:valid?Math.round(fort/3*100)/100:null,reason:String(x.reason||"").slice(0,300)}});
  return Response.json({results,notice:"KI-Schätzwerte ohne Live-Marktrecherche; vor Gutachtenverwendung prüfen."});
 }catch(e){return Response.json({error:e.message||"Bewertung fehlgeschlagen"},{status:500})}
}