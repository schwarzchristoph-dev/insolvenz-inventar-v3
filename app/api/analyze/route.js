import OpenAI from "openai";
export const runtime="nodejs";
export async function POST(req){
 try{
  if(!process.env.OPENAI_API_KEY)return Response.json({error:"OPENAI_API_KEY fehlt in Vercel."},{status:500});
  const {image}=await req.json(); if(!image)return Response.json({error:"Kein Bild erhalten."},{status:400});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await client.responses.create({model:"gpt-5.4-mini",input:[{role:"user",content:[{type:"input_text",text:"Analysiere dieses Inventarfoto/Typenschild. Falls mehrere klar getrennte Gegenstände sichtbar sind, gib jeden als eigenen Artikel zurück. Lies nur sicher erkennbare Daten. Bezeichnung immer in dieser Reihenfolge: Gegenstandsart, Hersteller, Modell/Typ, danach wichtige Daten. Beispiel: Drucker EPSON WorkForce XY, Nr. 123, Baujahr 2024. Antworte ausschließlich als JSON: {\"items\":[{\"designation\":\"\",\"manufacturer\":\"\",\"model\":\"\",\"serial\":\"\",\"year\":\"\",\"notes\":\"\"}]}."},{type:"input_image",image_url:image}]}]});
  const text=r.output_text.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,""); return Response.json(JSON.parse(text));
 }catch(e){return Response.json({error:e.message||"KI-Analyse fehlgeschlagen"},{status:500})}
}