import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import AuthScreen from './AuthScreen';
import { supabase } from './lib/supabase';

type View = 'overview' | 'transactions' | 'cards' | 'investments' | 'settings';
type TransactionType = 'income' | 'expense' | 'card';

type Transaction = {
  id: number;
  description: string;
  category: string;
  amount: number;
  date: string;
  type: TransactionType;
  card?: string;
};

type Investment = {
  id: number;
  name: string;
  className: string;
  invested: number;
  current: number;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const navItems = [
  { id: 'overview' as const, label: 'Visão geral', icon: LayoutDashboard },
  { id: 'transactions' as const, label: 'Lançamentos', icon: ReceiptText },
  { id: 'cards' as const, label: 'Cartões', icon: CreditCard },
  { id: 'investments' as const, label: 'Investimentos', icon: TrendingUp },
  { id: 'settings' as const, label: 'Configurações', icon: Settings },
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    let active = true;
    let changedSinceStart = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event === 'INITIAL_SESSION') return;
      changedSinceStart = true;
      setUser(session?.user ?? null);
      setCheckingSession(false);
      setSignOutError('');
    });

    void supabase.auth.getUser().then(({ data, error }) => {
      if (active && !changedSinceStart) {
        setUser(error ? null : data.user);
        setCheckingSession(false);
      }
    }).catch(() => {
      if (active && !changedSinceStart) {
        setUser(null);
        setCheckingSession(false);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) setSignOutError('Não foi possível sair da conta. Tente novamente.');
  }

  if (checkingSession) return <div className="auth-loading" role="status"><span className="auth-loading-logo"><WalletCards size={26} /></span>Carregando Monetra...</div>;
  if (!user) return <AuthScreen />;

  return <Dashboard key={user.id} user={user} onSignOut={signOut} signOutError={signOutError} />;
}

function loadPrivateList<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function Dashboard({ user, onSignOut, signOutError }: { user: User; onSignOut: () => void; signOutError: string }) {
  const transactionKey = `monetra-transactions:${user.id}`;
  const investmentKey = `monetra-investments:${user.id}`;
  const [view, setView] = useState<View>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadPrivateList<Transaction>(transactionKey));
  const [investments, setInvestments] = useState<Investment[]>(() => loadPrivateList<Investment>(investmentKey));
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);

  const summary = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter((t) => t.type !== 'income').reduce((sum, t) => sum + t.amount, 0);
    const card = transactions.filter((t) => t.type === 'card').reduce((sum, t) => sum + t.amount, 0);
    const invested = investments.reduce((sum, item) => sum + item.current, 0);
    return { income, expense, card, invested, balance: income - expense };
  }, [transactions, investments]);

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const type = data.get('type') as TransactionType;
    const next: Transaction = {
      id: Date.now(),
      description: String(data.get('description')),
      category: String(data.get('category')),
      amount: Number(data.get('amount')),
      date: String(data.get('date')),
      type,
      card: type === 'card' ? String(data.get('card') || 'Cartão principal') : undefined,
    };
    const updated = [next, ...transactions];
    setTransactions(updated);
    localStorage.setItem(transactionKey, JSON.stringify(updated));
    setShowTransactionForm(false);
  }

  function addInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const invested = Number(data.get('invested'));
    const current = Number(data.get('current'));
    const next: Investment = {
      id: Date.now(),
      name: String(data.get('name')),
      className: String(data.get('className')),
      invested,
      current,
    };
    const updated = [next, ...investments];
    setInvestments(updated);
    localStorage.setItem(investmentKey, JSON.stringify(updated));
    setShowInvestmentForm(false);
  }

  function navigate(nextView: View) {
    setView(nextView);
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <Brand />
        <nav className="sidebar-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => navigate(id)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{user.email?.slice(0, 2).toUpperCase() || 'ME'}</div>
          <div className="sidebar-identity">
            <strong title={user.email}>{user.email?.split('@')[0] || 'Usuário'}</strong>
            <span>Conta pessoal</span>
          </div>
          <button className="icon-button logout-button" type="button" onClick={onSignOut} aria-label="Sair da conta" title="Sair"><LogOut size={19} /></button>
        </div>
      </aside>

      <header className="mobile-header">
        <Brand />
        <button type="button" className="icon-button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
      </header>

      {menuOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="drawer-head"><Brand /><button type="button" className="icon-button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X size={22} /></button></div>
          <nav className="sidebar-nav">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => navigate(id)}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <button type="button" className="drawer-signout" onClick={onSignOut}><LogOut size={19} /> Sair da conta</button>
        </div>
      )}

      <main className="main-content">
        {signOutError && <p className="auth-message auth-error" role="alert">{signOutError}</p>}
        {view === 'overview' && <Overview summary={summary} transactions={transactions} onNew={() => setShowTransactionForm(true)} />}
        {view === 'transactions' && <Transactions transactions={transactions} onNew={() => setShowTransactionForm(true)} />}
        {view === 'cards' && <Cards transactions={transactions} onNew={() => setShowTransactionForm(true)} />}
        {view === 'investments' && <Investments investments={investments} onNew={() => setShowInvestmentForm(true)} />}
        {view === 'settings' && <SettingsView email={user.email ?? ''} onSignOut={onSignOut} />}
      </main>

      {showTransactionForm && <TransactionDialog onClose={() => setShowTransactionForm(false)} onSubmit={addTransaction} />}
      {showInvestmentForm && <InvestmentDialog onClose={() => setShowInvestmentForm(false)} onSubmit={addInvestment} />}
    </div>
  );
}

function Brand() {
  return <div className="brand"><div className="brand-mark"><WalletCards size={20} /></div><span>Monetra</span></div>;
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className="primary-button" onClick={onClick}><Plus size={17} />{children}</button>;
}

function Overview({ summary, transactions, onNew }: { summary: { income:number; expense:number; card:number; invested:number; balance:number }; transactions: Transaction[]; onNew: () => void }) {
  const monthlyMax = Math.max(summary.income, summary.expense, 1);
  return <>
    <PageHeader title="Visão geral" subtitle="Acompanhe seu mês em um só lugar." action={<PrimaryButton onClick={onNew}>Novo lançamento</PrimaryButton>} />
    <section className="balance-panel">
      <div><span>Saldo do mês</span><strong>{money.format(summary.balance)}</strong><small>Receitas menos despesas registradas</small></div>
      <PiggyBank size={34} strokeWidth={1.5} />
    </section>
    <section className="stats-row" aria-label="Resumo financeiro">
      <Stat label="Receitas" value={summary.income} tone="positive" />
      <Stat label="Despesas" value={summary.expense} tone="negative" />
      <Stat label="Fatura em cartões" value={summary.card} />
      <Stat label="Investimentos" value={summary.invested} />
    </section>
    <div className="dashboard-grid">
      <section className="section-block">
        <div className="section-heading"><div><h2>Fluxo do mês</h2><p>Entradas e saídas registradas</p></div></div>
        <div className="bar-chart" aria-label="Comparação de receitas e despesas">
          <Bar label="Receitas" value={summary.income} width={(summary.income/monthlyMax)*100} tone="income" />
          <Bar label="Despesas" value={summary.expense} width={(summary.expense/monthlyMax)*100} tone="expense" />
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><h2>Últimos lançamentos</h2><p>Movimentações mais recentes</p></div></div>
        <TransactionList transactions={transactions.slice(0, 5)} compact />
      </section>
    </div>
  </>;
}

function Stat({ label, value, tone }: { label:string; value:number; tone?: 'positive'|'negative' }) {
  return <div className="stat"><span>{label}</span><strong className={tone ? `text-${tone}` : ''}>{money.format(value)}</strong></div>;
}

function Bar({ label, value, width, tone }: {label:string; value:number; width:number; tone:'income'|'expense'}) {
  return <div className="bar-item"><div className="bar-meta"><span>{label}</span><strong>{money.format(value)}</strong></div><div className="bar-track"><div className={`bar-fill ${tone}`} style={{ width: `${Math.max(width, 4)}%` }} /></div></div>;
}

function Transactions({ transactions, onNew }: { transactions: Transaction[]; onNew: () => void }) {
  return <><PageHeader title="Lançamentos" subtitle="Receitas, despesas e compras no cartão." action={<PrimaryButton onClick={onNew}>Adicionar</PrimaryButton>} /><section className="section-block"><TransactionList transactions={transactions} /></section></>;
}

function TransactionList({ transactions, compact = false }: { transactions: Transaction[]; compact?: boolean }) {
  return <div className="transaction-list">{transactions.map((transaction) => {
    const isIncome = transaction.type === 'income';
    const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
    return <div className="transaction-row" key={transaction.id}>
      <div className={`transaction-icon ${isIncome ? 'income' : 'expense'}`}><Icon size={17} /></div>
      <div className="transaction-main"><strong>{transaction.description}</strong><span>{transaction.category}{transaction.card ? ` · ${transaction.card}` : ''}</span></div>
      {!compact && <time dateTime={transaction.date}>{new Date(`${transaction.date}T12:00:00`).toLocaleDateString('pt-BR')}</time>}
      <strong className={isIncome ? 'text-positive' : 'text-negative'}>{isIncome ? '+' : '-'} {money.format(transaction.amount)}</strong>
    </div>;
  })}</div>;
}

function Cards({ transactions, onNew }: { transactions: Transaction[]; onNew: () => void }) {
  const cardTransactions = transactions.filter((t) => t.type === 'card');
  const grouped = cardTransactions.reduce<Record<string, number>>((acc, t) => { acc[t.card || 'Cartão'] = (acc[t.card || 'Cartão'] || 0) + t.amount; return acc; }, {});
  return <>
    <PageHeader title="Cartões" subtitle="Compras e faturas concentradas por cartão." action={<PrimaryButton onClick={onNew}>Lançar compra</PrimaryButton>} />
    <div className="card-summary-grid">{Object.entries(grouped).map(([card, total]) => <div className="credit-card" key={card}><span>{card}</span><small>Fatura atual</small><strong>{money.format(total)}</strong><div className="card-line"><span>Fechamento dia 25</span><span>•••• 4821</span></div></div>)}</div>
    <section className="section-block"><div className="section-heading"><div><h2>Compras no cartão</h2><p>Valores entram automaticamente na fatura do cartão escolhido.</p></div></div><TransactionList transactions={cardTransactions} /></section>
  </>;
}

function Investments({ investments, onNew }: { investments: Investment[]; onNew: () => void }) {
  const totalInvested = investments.reduce((s,i) => s+i.invested,0);
  const totalCurrent = investments.reduce((s,i) => s+i.current,0);
  const result = totalCurrent-totalInvested;
  return <>
    <PageHeader title="Investimentos" subtitle="Acompanhe aportes, valor atual e resultado." action={<PrimaryButton onClick={onNew}>Novo investimento</PrimaryButton>} />
    <section className="stats-row"><Stat label="Total investido" value={totalInvested} /><Stat label="Valor atual" value={totalCurrent} /><Stat label="Resultado" value={result} tone={result >= 0 ? 'positive' : 'negative'} /></section>
    <section className="section-block investments-table"><div className="section-heading"><div><h2>Carteira</h2><p>Posição atual por ativo</p></div></div><div className="table-scroll"><table><thead><tr><th>Ativo</th><th>Classe</th><th>Investido</th><th>Atual</th><th>Resultado</th></tr></thead><tbody>{investments.map((item) => { const resultItem=item.current-item.invested; return <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.className}</td><td>{money.format(item.invested)}</td><td>{money.format(item.current)}</td><td className={resultItem >= 0 ? 'text-positive' : 'text-negative'}>{money.format(resultItem)}</td></tr>; })}</tbody></table></div></section>
  </>;
}

function SettingsView({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return <><PageHeader title="Configurações" subtitle="Preferências básicas da sua conta financeira." /><section className="section-block settings-block"><div><h2>Conta conectada</h2><p>{email}</p></div><div><h2>Moeda</h2><p>Real brasileiro (BRL)</p></div><div><h2>Armazenamento</h2><p>Seus lançamentos atuais ficam neste navegador, separados por usuário. A sincronização com o banco será implementada na próxima fase.</p></div><div><h2>Sessão</h2><button type="button" className="secondary-button settings-signout" onClick={onSignOut}><LogOut size={16} /> Sair da conta</button></div></section></>;
}

function TransactionDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const today = new Date().toISOString().slice(0,10);
  return <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="transaction-title"><div className="dialog-head"><div><h2 id="transaction-title">Novo lançamento</h2><p>Registre uma movimentação financeira.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div><form onSubmit={onSubmit} className="form-grid">
    <Field label="Descrição"><input id="description" name="description" required placeholder="Ex.: Supermercado" /></Field>
    <Field label="Tipo"><select id="type" name="type" defaultValue="expense"><option value="expense">Despesa</option><option value="income">Receita</option><option value="card">Compra no cartão</option></select></Field>
    <Field label="Categoria"><select id="category" name="category" defaultValue="Alimentação"><option>Alimentação</option><option>Casa</option><option>Transporte</option><option>Saúde</option><option>Educação</option><option>Lazer</option><option>Renda</option><option>Outros</option></select></Field>
    <Field label="Valor"><input id="amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00" /></Field>
    <Field label="Data"><input id="date" name="date" type="date" defaultValue={today} required /></Field>
    <Field label="Cartão (se aplicável)"><select id="card" name="card" defaultValue="Nubank"><option>Nubank</option><option>Inter</option><option>Cartão principal</option></select></Field>
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button">Salvar lançamento</button></div>
  </form></div></div>;
}

function InvestmentDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="investment-title"><div className="dialog-head"><div><h2 id="investment-title">Novo investimento</h2><p>Adicione um ativo à sua carteira.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div><form onSubmit={onSubmit} className="form-grid">
    <Field label="Ativo"><input id="name" name="name" required placeholder="Ex.: Tesouro Selic" /></Field>
    <Field label="Classe"><select id="className" name="className"><option>Renda fixa</option><option>ETF</option><option>Ações</option><option>Fundo imobiliário</option><option>Cripto</option><option>Outros</option></select></Field>
    <Field label="Total investido"><input id="invested" name="invested" type="number" min="0" step="0.01" required /></Field>
    <Field label="Valor atual"><input id="current" name="current" type="number" min="0" step="0.01" required /></Field>
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button">Salvar investimento</button></div>
  </form></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactElement<{ id?: string }> }) {
  return <label className="field" htmlFor={children.props.id}><span>{label}</span>{children}</label>;
}

export default App;
