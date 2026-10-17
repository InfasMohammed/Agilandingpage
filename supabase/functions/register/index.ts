import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const maxSize = 5 * 1024 * 1024;
Deno.serve(async (req) => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173,http://localhost:4173').split(',').map(value => value.trim()).filter(Boolean);
  const requestOrigin = req.headers.get('origin');
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
  const headers = { 'Access-Control-Allow-Origin': origin ?? '', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Content-Type': 'application/json' };
  const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
  if (!origin || req.headers.get('origin') !== origin) return reply(403, { error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (Deno.env.get('REGISTRATION_ENABLED') === 'false') return reply(503, { error: 'Registration is not open' });
  if (Number(req.headers.get('content-length') || 0) > maxSize + 16384) return reply(413, { error: 'File too large' });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let uploaded: string | null = null;
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!ip) return reply(400, { error: 'Unable to verify request source' });
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const ipHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const { count, error: limitError } = await db.from('registration').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', new Date(Date.now()-600_000).toISOString());
    if (limitError) throw limitError;
    if ((count ?? 0) >= 5) return reply(429, { error: 'Too many attempts. Please try again in 10 minutes.' });
    // Bound the body even when Content-Length is absent or falsified.
    const reader = req.body?.getReader();
    if (!reader) return reply(400, { error: 'Missing form' });
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > maxSize + 16384) { await reader.cancel(); return reply(413, { error: 'File too large' }); } chunks.push(value); }
    const bodyBytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bodyBytes.set(chunk, offset); offset += chunk.length; }
    const data = await new Response(new Blob([bodyBytes.buffer]), { headers: { 'Content-Type': req.headers.get('content-type') ?? '' } }).formData();
    const name = String(data.get('name') ?? '').trim(); const email = String(data.get('email') ?? '').trim().toLowerCase(); const phone = String(data.get('phone') ?? '').trim();
    const peopleText = String(data.get('people_count') ?? '');
    const peopleCount = Number(peopleText);
    if (!/^\d+$/.test(peopleText) || !Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 100) return reply(400, { error: 'Number of people must be a whole number from 1 to 100.' });
    if (data.get('website')) return reply(400, { error: 'Invalid submission' });
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !/^[+\d\s()\-]{7,25}$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15 || data.get('consent') !== 'on') return reply(400, { error: 'Please check your contact details and consent' });
    const { data: existing, error: lookupError } = await db.from('registration').select('id').eq('email', email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return reply(409, { error: 'This email is already registered. Each email can register only once.' });
    const file = data.get('receipt');
    if (!(file instanceof File) || file.size === 0 || file.size > maxSize) return reply(400, { error: 'Please upload an image up to 5 MB' });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i] === b);
    const webp = new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
    const mime = jpeg ? 'image/jpeg' : png ? 'image/png' : webp ? 'image/webp' : null;
    if (!mime || file.type !== mime) return reply(400, { error: 'Receipt must be a valid JPG, PNG or WebP image' });
    const id = crypto.randomUUID(); const path = `${id}/receipt.${jpeg ? 'jpg' : png ? 'png' : 'webp'}`;
    const { error: uploadError } = await db.storage.from('payment-receipts').upload(path, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError; uploaded = path;
    const { error: saveError } = await db.from('registration').insert({ id, name, email, phone, people_count: peopleCount, ip_hash: ipHash, receipt_path: path });
    if (saveError?.code === '23505') { await db.storage.from('payment-receipts').remove([path]); uploaded = null; return reply(409, { error: 'This email is already registered. Each email can register only once.' }); }
    if (saveError) throw saveError;
    return reply(201, { reference: id });
  } catch {
    if (uploaded) await db.storage.from('payment-receipts').remove([uploaded]);
    return reply(500, { error: 'Registration could not be saved. Please try again.' });
  }
});
