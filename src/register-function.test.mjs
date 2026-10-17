import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ts from 'typescript';
const source = readFileSync(new URL('../supabase/functions/register/index.ts', import.meta.url), 'utf8').replace(/^import .*\n/, '');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
function setup(options = {}) {
    let handler;
    const save = vi.fn(async () => ({ error: options.duplicateRace ? { code: '23505' } : options.saveFails ? new Error('save failed') : null }));
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));
    const db = {
        from: (table) => {
            if (table !== 'registration') throw new Error('Unexpected table: ' + table);
            return {
                insert: save,
                select: () => ({ eq: () => ({
                    gte: async () => ({ count: 0, error: null }),
                    maybeSingle: async () => ({ data: options.duplicate ? { id: 'existing' } : null, error: null }),
                }) }),
            };
        },
        storage: { from: () => ({ upload, remove }) },
    };
    const environment = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only', REGISTRATION_ENABLED: options.paused ? 'false' : undefined };
    new Function('Deno', 'createClient', compiled)({ serve: (fn) => { handler = fn; }, env: { get: (key) => environment[key] } }, () => db);
    return { handler, save, upload, remove };
}
function request(origin = 'http://localhost:5173', email = 'susan@example.com', phone = '+971 50 123 4567', people = '1', consent = 'on') {
    const data = new FormData();
    data.set('name', 'Susan Test');
    data.set('email', email);
    data.set('phone', phone);
    data.set('consent', consent);
    data.set('people_count', people);
    data.set('receipt', new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'test.png', { type: 'image/png' }));
    return new Request('https://example.supabase.co/functions/v1/register', { method: 'POST', headers: { origin, 'x-forwarded-for': '192.0.2.1' }, body: data });
}
describe('registration function', () => {
    it('accepts normal email and phone, stores a private receipt and returns a reference', async () => {
        const { handler, save, upload } = setup();
        const response = await handler(request());
        expect(response.status).toBe(201);
        expect((await response.json()).reference).toMatch(/^[0-9a-f-]{36}$/);
        expect(save).toHaveBeenCalledOnce();
        expect(upload).toHaveBeenCalledOnce();
    });
    it('rejects invalid contact details before storing a receipt', async () => {
        for (const [email, phone] of [['broken-email', '+971 50 123 4567'], ['valid@example.com', 'not-a-number']]) {
            const { handler, upload } = setup();
            expect((await handler(request(undefined, email, phone))).status).toBe(400);
            expect(upload).not.toHaveBeenCalled();
        }
    });
    it('restricts origins and respects the server pause setting', async () => {
        expect((await setup().handler(request('https://unapproved.example'))).status).toBe(403);
        expect((await setup({ paused: true }).handler(request())).status).toBe(503);
    });
    it('removes a receipt if saving the registration fails and never returns success', async () => {
        const { handler, remove } = setup({ saveFails: true });
        const response = await handler(request());
        expect(response.status).toBe(500);
        expect(remove).toHaveBeenCalledOnce();
        expect((await response.json()).reference).toBeUndefined();
    });
});

describe('unique registrations and attendee counts', () => {
    it('normalizes email and saves the attendee count', async () => {
        const { handler, save } = setup();
        expect((await handler(request(undefined, ' Susan@Example.com ', undefined, '4'))).status).toBe(201);
        expect(save.mock.calls[0][0]).toMatchObject({ email: 'susan@example.com', people_count: 4 });
    });
    it('rejects invalid counts and missing consent without uploading a receipt', async () => {
        for (const people of ['0', '-1', '1.5', '101', '', 'abc']) {
            const { handler, upload } = setup();
            expect((await handler(request(undefined, undefined, undefined, people))).status).toBe(400);
            expect(upload).not.toHaveBeenCalled();
        }
        expect((await setup().handler(request(undefined, undefined, undefined, '1', ''))).status).toBe(400);
    });
    it('rejects a duplicate before uploading and handles simultaneous duplicates safely', async () => {
        const first = setup({ duplicate: true });
        expect((await first.handler(request())).status).toBe(409);
        expect(first.upload).not.toHaveBeenCalled();
        const race = setup({ duplicateRace: true });
        expect((await race.handler(request())).status).toBe(409);
        expect(race.remove).toHaveBeenCalledOnce();
    });
});

describe('production registration origin', () => {
    it('accepts the production Vercel site and rejects other Vercel sites', async () => {
        expect((await setup().handler(request('https://asi-global-event.vercel.app'))).status).toBe(201);
        expect((await setup().handler(request('https://asi-global-event-aitiontechsl-2319s-projects.vercel.app'))).status).toBe(201);
        expect((await setup().handler(request('https://unrelated.vercel.app'))).status).toBe(403);
    });
});
