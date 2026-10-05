import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Receipt, 
  ArrowRightLeft, 
  Plus, 
  PieChart as PieIcon, 
  BarChart3,
  CheckCircle2, 
  Tag,
  TrendingUp,
  Check
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

const API_BASE = "http://127.0.0.1:8000";

const CATEGORY_COLORS = {
  Food: '#f59e0b',        // Amber
  Rent: '#ef4444',        // Red
  Travel: '#3b82f6',      // Blue
  Utilities: '#10b981',   // Emerald
  Entertainment: '#8b5cf6',// Purple
  General: '#64748b'      // Slate
};

export default function App() {
  const [users, setUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);

  // New User Form
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // New Expense Form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [payerId, setPayerId] = useState("");

  const categories = ["Food", "Rent", "Travel", "Utilities", "Entertainment", "General"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, eRes, bRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/users/`),
        fetch(`${API_BASE}/expenses/`),
        fetch(`${API_BASE}/settlements/balances/`),
        fetch(`${API_BASE}/settlements/simplify/`)
      ]);

      const uData = await uRes.json();
      const eData = await eRes.json();
      const bData = await bRes.json();
      const sData = await sRes.json();

      setUsers(uData);
      setExpenses(eData);
      setBalances(bData);
      setSettlements(sData);

      if (uData.length > 0 && !payerId) {
        setPayerId(uData[0].id);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userName || !userEmail) return;

    try {
      const res = await fetch(`${API_BASE}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, email: userEmail })
      });
      if (res.ok) {
        setUserName("");
        setUserEmail("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount || !payerId) return;

    try {
      const res = await fetch(`${API_BASE}/expenses/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          category,
          payer_id: parseInt(payerId)
        })
      });
      if (res.ok) {
        setTitle("");
        setAmount("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettleUp = async (payerId, payeeId, amount) => {
    try {
      const res = await fetch(`${API_BASE}/settlements/record/?payer_id=${payerId}&payee_id=${payeeId}&amount=${amount}`, {
        method: "POST"
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error settling up:", err);
    }
  };

  const totalSpent = expenses.filter(e => e.category !== "Settlement").reduce((sum, exp) => sum + exp.amount, 0);

  // Chart Data Generators
  const categoryData = categories.map((cat) => {
    const value = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: cat, value };
  }).filter((c) => c.value > 0);

  const memberSpendingData = users.map((u) => {
    const totalPaid = expenses
      .filter((e) => e.payer_id === u.id && e.category !== "Settlement")
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: u.name, Paid: totalPaid };
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
              SmartSplit
            </h1>
            <p className="text-slate-400 text-sm mt-1">Smart expense sharing & debt simplification</p>
          </div>
          <div className="flex items-center gap-6 bg-slate-800/80 px-6 py-3 rounded-xl border border-slate-700">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Pool Spent</p>
              <p className="text-2xl font-bold text-emerald-400">₹{totalSpent.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Members</p>
              <p className="text-2xl font-bold text-cyan-400">{users.length}</p>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Input Forms */}
          <div className="space-y-6">
            
            {/* Add User Card */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-emerald-400">
                <Users className="w-5 h-5" /> Add Member
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name (e.g., Rahul)"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 font-semibold py-2 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Member
                </button>
              </form>
            </div>

            {/* Log Expense Card */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-cyan-400">
                <Receipt className="w-5 h-5" /> Log New Expense
              </h2>
              <form onSubmit={handleCreateExpense} className="space-y-4">
                <input
                  type="text"
                  placeholder="Title (e.g. Biryani, Tea)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-semibold">Paid By</label>
                  <select
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    {users.length === 0 ? (
                      <option value="">Add a member first...</option>
                    ) : (
                      users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={users.length === 0}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 font-semibold py-2 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Expense
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Analytics, Member Balances, & Settlements */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Donut Chart */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 backdrop-blur-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-emerald-400">
                  <PieIcon className="w-4 h-4" /> Spending by Category
                </h3>
                {categoryData.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-slate-500 text-xs">
                    No expense data
                  </div>
                ) : (
                  <div className="h-48 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry) => (
                            <Cell 
                              key={`cell-${entry.name}`} 
                              fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val) => [`₹${val.toFixed(2)}`, 'Spent']}
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Bar Chart */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 backdrop-blur-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-cyan-400">
                  <BarChart3 className="w-4 h-4" /> Paid Per Member
                </h3>
                {memberSpendingData.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-slate-500 text-xs">
                    No member data
                  </div>
                ) : (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={memberSpendingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(val) => [`₹${val.toFixed(2)}`, 'Paid']}
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                        />
                        <Bar dataKey="Paid" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>

            {/* Net Balances */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-100">
                <TrendingUp className="w-5 h-5 text-indigo-400" /> Member Balances
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {balances.map((b) => (
                  <div 
                    key={b.user_id} 
                    className={`p-4 rounded-xl border ${
                      b.net_balance >= 0 
                        ? 'bg-emerald-950/30 border-emerald-800/50' 
                        : 'bg-rose-950/30 border-rose-800/50'
                    }`}
                  >
                    <p className="text-xs text-slate-400 font-semibold">{b.name}</p>
                    <p className={`text-xl font-bold mt-1 ${b.net_balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {b.net_balance >= 0 ? `+₹${b.net_balance.toFixed(2)}` : `-₹${Math.abs(b.net_balance).toFixed(2)}`}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {b.net_balance >= 0 ? 'Gets back overall' : 'Owes overall'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Debt Settlements */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-purple-400">
                <ArrowRightLeft className="w-5 h-5" /> Simplified Settlements
              </h2>
              {settlements.length === 0 ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> All balances are settled up!
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-rose-400">{s.payer_name}</span>
                        <span className="text-slate-500 text-xs uppercase tracking-widest">pays</span>
                        <span className="font-semibold text-emerald-400">{s.payee_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-extrabold text-amber-400">₹{s.amount.toFixed(2)}</span>
                        <button
                          onClick={() => handleSettleUp(s.payer_id, s.payee_id, s.amount)}
                          className="bg-emerald-600/80 hover:bg-emerald-500 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500 transition-all flex items-center gap-1 text-slate-100"
                        >
                          <Check className="w-3.5 h-3.5" /> Settle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Expenses List */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold mb-4 text-slate-100 flex items-center justify-between">
                <span>Recent Expenses</span>
                <span className="text-xs text-slate-400 font-normal">{expenses.length} logged</span>
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {expenses.length === 0 ? (
                  <p className="text-slate-500 text-sm">No expenses added yet.</p>
                ) : (
                  expenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <div>
                        <p className="font-bold text-slate-200">{exp.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            <Tag className="w-3 h-3 text-cyan-400" /> {exp.category}
                          </span>
                          <span>Paid by <strong className="text-slate-300">{exp.payer?.name || "Unknown"}</strong></span>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-cyan-400">₹{exp.amount.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}