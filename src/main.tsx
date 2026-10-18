import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, Clock3, Camera, Globe2, FileText, Check, CheckCircle2, ShieldCheck, TrendingUp, Eye, Menu, X, UploadCloud, ChevronDown, LoaderCircle } from 'lucide-react';
import { receiptError, registrationErrors, registrationReady, type RegistrationDetails } from './validation';
import './style.css';
import { organiserBank } from './bank';
import { WhatsAppIcon } from './whatsapp-icon';

const whatsapp = 'https://wa.me/971564723822?text=' + encodeURIComponent('I want to know more about the event');
const env = import.meta.env;
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://jkbrwuqugzkvzsaizqja.supabase.co';
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_j9Lw5Ljw2Qedn0H9KlKQHg_mzbcWVTW';
const bank = [['Account name', env.VITE_BANK_ACCOUNT_NAME || organiserBank.accountName], ['Bank name', env.VITE_BANK_NAME || organiserBank.bankName], ['Account number', env.VITE_BANK_ACCOUNT_NUMBER || organiserBank.accountNumber], ['IBAN', env.VITE_BANK_IBAN || organiserBank.iban], ['SWIFT code', env.VITE_BANK_SWIFT || organiserBank.swift], ['Currency', organiserBank.currency]];
const bankDetailsReady = bank.every(([, value]) => Boolean(value));
const canSubmit = bankDetailsReady;
function Brand({ light = false }: { light?: boolean }) { return <a href="#" className={`brand ${light ? 'light' : ''}`} aria-label="ASI Global home"><img src="/mark.svg" alt=""/><span><strong>ASI GLOBAL</strong><small>AUTHORITY · SPEAKER · INFLUENCE</small><em>FROM INVISIBLE TO INFLUENTIAL</em></span></a>; }
function RegisterModal({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const errorMessage = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');
  const [details, setDetails] = useState<RegistrationDetails>({ name: '', email: '', phone: '', peopleCount: '1' });
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof RegistrationDetails, boolean>>>({});
  const errors = registrationErrors(details);
  const formReady = canSubmit && registrationReady(details, file, agreed);
  const update = (field: keyof RegistrationDetails, value: string) => { setDetails(current => ({ ...current, [field]: value })); setError(''); };
  const blur = (field: keyof RegistrationDetails) => setTouched(current => ({ ...current, [field]: true }));
  const fieldError = (field: keyof RegistrationDetails) => touched[field] && errors[field] ? <span className="field-error" id={`${field}-error`}>{errors[field]}</span> : null;
  useEffect(() => { const node = dialog.current; node?.showModal(); const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { node?.close(); document.body.style.overflow = old; }; }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError('');
    if (!canSubmit) { setError('Payment details are unavailable. Please contact us on WhatsApp for assistance.'); return; }
    if (!formReady) { setError('Complete the required fields, attach your receipt, and tick the agreement before submitting.'); return; }
    if (!file) return;
    const invalid = receiptError(file); if (invalid) { setError(invalid); return; }
    setBusy(true);
    try {
      const data = new FormData(event.currentTarget); data.set('receipt', file); data.set('email', details.email.trim().toLowerCase());
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: result, error: failure } = await supabase.functions.invoke('register', { body: data });
      if (failure) {
        const response = 'context' in failure ? failure.context : null;
        const body = response instanceof Response ? await response.json().catch(() => null) : null;
        throw new Error(typeof body?.error === 'string' ? body.error : 'We couldn’t reach registration. Please try again or contact us on WhatsApp.');
      }
      if (!result?.reference) throw new Error('Registration was not confirmed. Please try again.');
      setReference(result.reference);
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); } finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="registration" onCancel={event => { if (busy) event.preventDefault(); else close(); }} onClick={event => { if (event.target === dialog.current && !busy) close(); }} aria-labelledby="registration-title"><button className="close" onClick={close} disabled={busy} aria-label="Close registration"><X/></button>{reference ? <div className="success"><CheckCircle2 size={52}/><p className="eyebrow">YOU’RE ONE STEP CLOSER</p><h2 id="registration-title">Registration received.</h2><p>Thank you! Our team will review your payment receipt and contact you to confirm your place.</p><div className="reference">Reference: <strong>{reference}</strong></div><p className="fine">Your place is confirmed only after payment verification.</p><button className="button gold" onClick={close}>Back to the event <ArrowRight size={18}/></button></div> : <><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2 id="registration-title">Secure your spot.</h2><p className="modal-intro">22 November 2026 · 2–5 pm · Dubai<br/>Personal Branding Starter Package · <strong>AED 499</strong></p>{!canSubmit && <div className="notice">Payment details are unavailable. Contact us on <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a> for registration and verified payment details.</div>}<form onSubmit={submit}><div className="form-grid"><label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your full name" value={details.name} onChange={event => update('name', event.target.value)} onBlur={() => blur('name')} aria-invalid={Boolean(touched.name && errors.name)} aria-describedby={touched.name && errors.name ? 'name-error' : undefined}/>{fieldError('name')}</label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={details.email} onChange={event => update('email', event.target.value)} onBlur={() => blur('email')} aria-invalid={Boolean(touched.email && errors.email)} aria-describedby={touched.email && errors.email ? 'email-error' : undefined}/>{fieldError('email')}</label></div><label>Phone / WhatsApp<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={25} placeholder="+971 50 123 4567" value={details.phone} onChange={event => update('phone', event.target.value)} onBlur={() => blur('phone')} aria-invalid={Boolean(touched.phone && errors.phone)} aria-describedby={touched.phone && errors.phone ? 'phone-error' : undefined}/>{fieldError('phone')}</label><label>Number of people (including yourself)<input name="people_count" type="number" inputMode="numeric" min={1} max={100} step={1} required value={details.peopleCount} onChange={event => update('peopleCount', event.target.value)} onBlur={() => blur('peopleCount')} aria-invalid={Boolean(touched.peopleCount && errors.peopleCount)} aria-describedby={touched.peopleCount && errors.peopleCount ? 'peopleCount-error' : undefined}/>{fieldError('peopleCount')}</label><label className="trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label><div className="payment-mini"><strong>1. Bank transfer · AED 499</strong><p>{canSubmit ? 'Transfer to the company account below and keep your receipt.' : 'Bank details are provided below. Please wait until registration opens before transferring your payment.'}</p>{bankDetailsReady && <dl>{bank.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}</div><label className="upload"><UploadCloud size={26}/><strong>2. Upload your payment receipt</strong><span>{file ? file.name : 'Choose a bank payment screenshot'}</span><small>JPG, PNG or WebP · up to 5 MB</small><input type="file" name="receipt" accept="image/jpeg,image/png,image/webp" required onChange={event => { const next = event.target.files?.[0]; setError(''); if (!next) { setFile(null); return; } const invalid = receiptError(next); if (invalid) { setFile(null); event.target.value = ''; setError(invalid); } else setFile(next); }}/></label><label className="consent"><input type="checkbox" name="consent" required checked={agreed} onChange={event => { setAgreed(event.target.checked); setError(''); }}/><span>I agree to be contacted about my registration. My details and payment receipt will be used to process and verify this booking.</span></label>{error && <p ref={errorMessage} className="error" role="alert" tabIndex={-1}>{error}</p>}<button className="button gold submit" type="submit" disabled={busy || !formReady}>{busy ? <><LoaderCircle className="spin" size={18}/> Submitting…</> : <>Submit registration <ArrowRight size={18}/></>}</button><p className="fine">Complete all fields, attach your receipt and tick the agreement to enable Submit. One registration per email.</p></form></>}</dialog>;
}
const audiences = [
  { title: 'Professionals & executives', text: 'Turn your experience into a presence that opens doors.' },
  { title: 'Entrepreneurs & consultants', text: 'Give your expertise a brand people remember.' },
  { title: 'Coaches & speakers', text: 'Build the authority to make your voice count.' },
  { title: 'Job seekers & freelancers', text: 'Stand out with a portfolio that speaks for you.' },
];
function App() {
  const [modal, setModal] = useState(false); const [menu, setMenu] = useState(false);
  const register = () => setModal(true);
  const navigation = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !navigation.current?.contains(event.target)) setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenu(false); menuButton.current?.focus(); }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);
  return <><main><section className="hero"><div className="hero-image"/>
    <div className="hero-navigation"><div className="container nav" ref={navigation}>
      <Brand light/>
      <button ref={menuButton} className="menu" onClick={() => setMenu(open => !open)} aria-expanded={menu} aria-controls="event-navigation" aria-label={menu ? 'Close navigation' : 'Open navigation'}>{menu ? <X/> : <Menu/>}</button>
      <nav id="event-navigation" aria-label="Main navigation" hidden={!menu}>
        <a href="#about" onClick={() => setMenu(false)}>The program</a>
        <a href="#package" onClick={() => setMenu(false)}>The package</a>
        <a href="#venue" onClick={() => setMenu(false)}>Venue &amp; payment</a>
      </nav>
    </div></div>
    <div className="container hero-content"><p className="eyebrow"><span/> ASI GLOBAL PRESENTS <span className="edition">DUBAI · 2026</span></p><h1 className="event-headline">C.A.V. Personal<br className="headline-break"/> Branding &amp;<br/><span>Professional Portfolio</span></h1><p className="hero-sub">It’s time to be seen, heard and remembered.</p><p className="hero-desc">Your expertise is your advantage.<br/>Let’s make sure the world knows it.</p><div className="event-facts"><div><CalendarDays/><span>Sunday<strong>22 Nov 2026</strong></span></div><div><Clock3/><span>Afternoon session<strong>2:00–5:00 pm</strong></span></div><div><MapPin/><span>Dubai, UAE<strong>Holiday Inn Express Al Safa</strong></span></div></div><div className="hero-actions"><button className="button gold" onClick={register}>Register now <ArrowUpRight size={20}/></button><span className="seat-note"><span className="status-dot"/> Limited seats. Lasting impact.</span></div><a className="discover" href="#about">DISCOVER YOUR NEXT CHAPTER <ChevronDown size={15}/></a></div><div className="hero-side">FROM INVISIBLE TO INFLUENTIAL</div><div className="hero-caption"><span>YOUR STORY.</span><br/>A stronger spotlight.<i/></div></section>
  <div className="principles"><div className="container"><span>YOUR EXPERIENCE. <b>AMPLIFIED.</b></span><span><i/> CREDIBILITY</span><span><i/> AUTHORITY</span><span><i/> VISIBILITY</span><span className="principle-end">MAKE YOUR MARK <ArrowUpRight size={17}/></span></div></div>
  <section className="about section container" id="about"><div className="about-copy"><p className="eyebrow">MORE THAN A PERSONAL BRAND</p><h2>You’ve done the work.<br/>Now, <em>own the spotlight.</em></h2><p className="lead">Your expertise deserves to be seen,<br className="desktop"/> heard, and recognised.</p><p>You have the skills, the experience, and the ambition. But when people can’t discover who you are and what you offer, opportunities can pass you by.</p><p>ASI Global helps professionals, entrepreneurs, coaches, consultants, and aspiring speakers turn their experience into a credible, visible personal brand.</p><a href="#package" className="text-link">Build a presence that works for you <ArrowUpRight size={19}/></a><div className="signature">Your next chapter begins with you.</div></div><div className="package" id="package"><div className="package-top"><span>THE PERSONAL BRANDING</span><h3>Starter Package</h3><span className="package-badge">YOUR BRAND, ELEVATED</span></div><div className="price"><span>AED</span> 499<span className="price-note">One investment. A stronger presence.</span></div><div className="package-items">{[{icon:Camera,title:'Professional photoshoot',text:'High-quality professional images that put your best self forward.'},{icon:Globe2,title:'Personal branding website',text:'Your own digital platform to tell your story and showcase your expertise.'},{icon:FileText,title:'Professional portfolio',text:'A compelling presentation of your background, achievements, credentials, and services.'}].map(({icon:Icon,title,text})=><div key={title}><span className="icon-disc"><Icon size={22}/></span><div><h4>{title}</h4><p>{text}</p></div><Check size={17} className="item-check"/></div>)}</div></div></section>
  <section className="audience section" id="for-you"><div className="container"><div className="section-heading"><div><p className="eyebrow">BUILT FOR PEOPLE GOING PLACES</p><h2>Great at what you do?<br/><em>Let the world see it.</em></h2></div><p>Wherever you are in your journey,<br/>your personal brand is your next move.</p></div><div className="audience-grid">{audiences.map((a,index)=><article key={a.title}><div className="audience-image"><div className="audience-photo" role="img" aria-label={a.title} style={{backgroundPosition: `${index * 100 / 3}% 35%`}}/><span>0{index+1}</span><ArrowUpRight/></div><div className="audience-copy"><h3>{a.title}</h3><p>{a.text}</p></div></article>)}</div></div></section>
  <section className="promise"><div className="container promise-grid"><div><p className="eyebrow">THE C.A.V. PROMISE</p><h2>Don’t just show up.<br/><em>Stand for something.</em></h2><p>Three pillars. One unmistakable you.</p></div><div className="pillars">{[{icon:ShieldCheck,title:'Credibility',text:'Be recognised for the expertise you’ve earned.'},{icon:TrendingUp,title:'Authority',text:'Position yourself as the trusted voice in your field.'},{icon:Eye,title:'Visibility',text:'Reach the right people. Find new opportunities.'}].map(({icon:Icon,title,text})=><div key={title}><div className="pillar-icon"><Icon size={30}/></div><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>
  <section className="venue section container" id="venue"><div className="venue-visual"><img src="/images/dubai.svg" alt="Dubai skyline with the Burj Khalifa" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/dubai.svg"; }} loading="lazy"/><span className="image-label">A NEW PERSPECTIVE STARTS IN DUBAI</span><div className="venue-card"><div><CalendarDays/><span>Save the date<strong>Sunday, 22 November 2026</strong><small>2:00 pm – 5:00 pm · Gulf Standard Time</small></span></div><div><MapPin/><span>Meet us at<strong>Holiday Inn Express Al Safa</strong><a href="https://www.google.com/maps/search/?api=1&query=Holiday+Inn+Express+Al+Safa+Dubai" target="_blank" rel="noreferrer">Dubai, UAE · Get directions <ArrowUpRight size={13}/></a></span></div></div></div><div className="payment"><p className="eyebrow">ONE SIMPLE STEP CLOSER</p><h2>Your place.<br/><em>Your next possibility.</em></h2><p>Register for the AED 499 package using the button below. You’ll find payment instructions inside the registration form. Make your transfer, attach your bank receipt, and submit — all in one place.</p><div className="registration-steps"><div><span>01</span><div><strong>Tell us a little about yourself</strong><p>Add your name, email, and WhatsApp number.</p></div></div><div><span>02</span><div><strong>Make your bank transfer</strong><p>Verified bank details appear inside the registration form.</p></div></div><div><span>03</span><div><strong>Upload your receipt. You’re all set.</strong><p>Our team will review your payment and confirm your place.</p><button className="button gold step-register" onClick={register}>Register now <ArrowUpRight size={19}/></button></div></div></div><div className="payment-note"><ShieldCheck size={19}/><span>Your receipt is uploaded privately and reviewed by our team.</span></div></div></section>
  <section className="final-cta"><div className="container"><div><p className="eyebrow">FROM INVISIBLE TO INFLUENTIAL</p><h2>The world should know <em>your name.</em></h2></div></div></section></main>
  <footer><div className="container footer-main"><a className="footer-logo" href="#" aria-label="ASI Global home"><img src="/images/logo.jpeg" alt="ASI Global — Authority, Speaker, Influence. From Invisible to Influential." width={1254} height={1254} loading="lazy"/></a><a href={whatsapp} className="footer-whatsapp" target="_blank" rel="noreferrer" aria-label="Chat with ASI Global on WhatsApp"><span><WhatsAppIcon size={25}/></span><div><small>A QUESTION? LET’S CONNECT.</small><strong>+971 56 472 3822 <ArrowUpRight size={15}/></strong></div></a><p>Credibility. Authority. Visibility.<br/><span>Your story deserves a bigger stage.</span></p></div><div className="container footer-bottom"><span>© 2026 ASI Global. All rights reserved.</span><span>Made for your next chapter.</span></div></footer><a className="floating-whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Ask about the event on WhatsApp"><WhatsAppIcon size={27}/></a>{modal && <RegisterModal close={()=>setModal(false)}/>}</>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
