import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth.jsx';
import { Icon, Logo } from '../../components/Icons.jsx';
import { errMsg } from '../../lib/format.js';

const BASE = () => window.location.origin + import.meta.env.BASE_URL;

function AuthFrame({ title, subtitle, children, foot }) {
  return (
    <div className="auth">
      <Logo />
      <div className="bn">Anandam Villas</div>
      <div className="bs">KGR Fortune × Milke Khareedo · Partner Desk</div>
      <h1>{title}</h1>
      <p className="sub">{subtitle}</p>
      <div className="card">{children}</div>
      {foot && <p className="foot">{foot}</p>}
    </div>
  );
}

function Field({ id, label, icon, right, ...props }) {
  return (
    <div className="f">
      {right ? <div className="row-between"><label htmlFor={id}>{label}</label>{right}</div> : <label htmlFor={id}>{label}</label>}
      <div className="withicon"><Icon id={icon} /><input id={id} {...props} /></div>
      {props['data-hint'] && <p className="hint">{props['data-hint']}</p>}
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const notice = new URLSearchParams(window.location.search).get('m');
  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!email || !pw) return setErr('Enter your email and password.');
    setBusy(true);
    const r = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (r.error) {
      return setErr(/confirm/i.test(r.error.message)
        ? 'Confirm your email first. Open the link we sent you, then log in.'
        : "That email and password don't match. Try again or reset your password.");
    }
    nav('/');
  }
  return (
    <AuthFrame title="Welcome back" subtitle="Log in to your account"
      foot={<>New partner? <Link to="/signup">Create an account</Link></>}>
      {notice === 'reset' && <div className="notice info" style={{ marginBottom: 16 }}>If that email has an account, a reset link is on its way.</div>}
      <form className="form" onSubmit={submit} noValidate>
        <Field id="le" label="Email" icon="i-mail" type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="lp" label="Password" icon="i-lock" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)}
          right={<Link className="link" to="/forgot">Forgot password?</Link>} />
        {err && <p className="err">{err}</p>}
        <button className="btn block" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthFrame>
  );
}

export function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErr('Enter a valid email address.');
    if (pw.length < 8) return setErr('Use a password of at least 8 characters.');
    setBusy(true);
    const r = await supabase.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: BASE() } });
    setBusy(false);
    if (r.error) return setErr(/registered|exists/i.test(r.error.message) ? 'An account with this email already exists. Log in instead.' : errMsg(r.error));
    if (r.data?.session) return nav('/');
    setSent(true);
  }
  if (sent) {
    return (
      <AuthFrame title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <p className="sub" style={{ margin: 0 }}>Open the link to confirm your email, then log in to fill in your partner enrolment.</p>
        <div style={{ marginTop: 18 }}><Link className="btn block" to="/login">Go to log in</Link></div>
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title="Create your account" subtitle="Step 1 of 2. Then fill in your partner enrolment."
      foot={<>Already a partner? <Link to="/login">Log in</Link></>}>
      <form className="form" onSubmit={submit} noValidate>
        <Field id="se" label="Email" icon="i-mail" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="sp" label="Password" icon="i-lock" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} data-hint="At least 8 characters." />
        {err && <p className="err">{err}</p>}
        <button className="btn block" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
    </AuthFrame>
  );
}

export function Forgot() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const r = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: BASE() + 'reset' });
    setBusy(false);
    if (r.error) return setErr(errMsg(r.error));
    nav('/login?m=reset');
  }
  return (
    <AuthFrame title="Reset password" subtitle="We'll email you a link to set a new password." foot={<Link to="/login">Back to log in</Link>}>
      <form className="form" onSubmit={submit} noValidate>
        <Field id="fe" label="Email" icon="i-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {err && <p className="err">{err}</p>}
        <button className="btn block" type="submit" disabled={busy}>Send reset link</button>
      </form>
    </AuthFrame>
  );
}

export function Recovery() {
  const nav = useNavigate();
  const { finishRecovery } = useAuth();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    const r = await supabase.auth.updateUser({ password: pw });
    if (r.error) return setErr(errMsg(r.error));
    finishRecovery();
    nav('/');
  }
  return (
    <AuthFrame title="Set a new password" subtitle="Choose a new password for your account.">
      <form className="form" onSubmit={submit} noValidate>
        <Field id="rp" label="New password" icon="i-lock" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <p className="err">{err}</p>}
        <button className="btn block" type="submit">Save password</button>
      </form>
    </AuthFrame>
  );
}
