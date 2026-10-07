import { FormEvent, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, WalletCards } from 'lucide-react';
import { supabase } from './lib/supabase';

type Mode = 'login' | 'signup';

function messageForAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.';
  if (/user already registered/i.test(message)) return 'Este e-mail já possui cadastro. Entre com sua senha.';
  if (/password should be at least/i.test(message)) return 'Sua senha precisa ter pelo menos 8 caracteres.';
  if (/rate limit|too many requests/i.test(message)) return 'Muitas tentativas. Tente novamente mais tarde.';
  if (/failed to fetch|network/i.test(message)) return 'Não foi possível conectar ao servidor. Verifique sua internet.';
  return 'Não foi possível concluir a autenticação. Tente novamente.';
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setPassword('');
    setPasswordConfirmation('');
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'signup' && password !== passwordConfirmation) {
      setError('As senhas não são iguais.');
      return;
    }

    setPending(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (authError) throw authError;
        // The auth state listener in App opens the private dashboard.
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (!data.session) {
          setSuccess('Cadastro recebido! Confira seu e-mail e confirme a conta para entrar.');
        } else {
          setSuccess('Conta criada com sucesso!');
        }
      }
    } catch (cause) {
      setError(messageForAuthError(cause instanceof Error ? cause.message : ''));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-label="Boas-vindas ao Monetra">
        <div className="auth-brand"><span className="auth-brand-mark"><WalletCards size={25} /></span>Monetra</div>
        <div className="auth-intro-content">
          <span className="auth-eyebrow">SEU DINHEIRO, SUA VISÃO</span>
          <h1>Organize suas finanças com mais tranquilidade.</h1>
          <p>Receitas, despesas, cartões e investimentos em um lugar feito para suas decisões.</p>
          <div className="auth-privacy"><ShieldCheck size={20} /><span>Acesso individual protegido pelo Supabase Auth</span></div>
        </div>
        <small>Monetra · Controle financeiro pessoal</small>
      </section>

      <section className="auth-form-area" aria-label="Acessar conta">
        <div className="auth-card">
          <div className="auth-mobile-brand"><span className="auth-brand-mark"><WalletCards size={19} /></span>Monetra</div>
          <span className="auth-card-eyebrow">BEM-VINDO AO MONETRA</span>
          <h2>{mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}</h2>
          <p className="auth-subtitle">{mode === 'login' ? 'Digite seu e-mail e senha para continuar.' : 'Cadastre-se para começar a organizar suas finanças.'}</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="auth-email">E-mail</label>
            <div className="auth-input-wrap"><Mail size={18} aria-hidden="true" /><input id="auth-email" type="email" name="email" autoComplete="email" placeholder="voce@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} /></div>

            <label htmlFor="auth-password">Senha</label>
            <div className="auth-input-wrap"><Lock size={18} aria-hidden="true" /><input id="auth-password" type={showPassword ? 'text' : 'password'} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Digite sua senha" required minLength={mode === 'signup' ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} /><button className="auth-show-password" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>

            {mode === 'signup' && <><label htmlFor="auth-confirm">Confirme a senha</label><div className="auth-input-wrap"><Lock size={18} aria-hidden="true" /><input id="auth-confirm" type="password" name="confirm" autoComplete="new-password" placeholder="Repita sua senha" required minLength={8} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} disabled={pending} /></div><p className="auth-password-hint">Use pelo menos 8 caracteres.</p></>}

            {error && <p className="auth-message auth-error" role="alert">{error}</p>}
            {success && <p className="auth-message auth-success" role="status">{success}</p>}
            <button className="auth-submit" type="submit" disabled={pending}>{pending ? 'Aguarde...' : mode === 'login' ? 'Entrar na minha conta' : 'Criar conta'}<ArrowRight size={18} /></button>
          </form>

          <p className="auth-switch">{mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'} <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} disabled={pending}>{mode === 'login' ? 'Cadastre-se' : 'Fazer login'}</button></p>
        </div>
      </section>
    </main>
  );
}
