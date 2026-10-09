import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Trophy, Users, Calendar, ChartColumn, LogOut, Plus, Trash2, Pencil,
  ChevronDown, ChevronRight, Zap, ListChecks, GripVertical,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { generateRoundRobin } from '@/lib/fixture';
import {
  StatusBadge, LoadingSpinner, EmptyState, Modal, ConfirmDialog,
} from '@/components/ui';
import type {
  League, Category, Player, Pair, Match, MatchSet, LeagueSeason, Modality,
} from '@/types';

type AdminTab = 'leagues' | 'players' | 'pairs' | 'fixture' | 'results';

const MODALITIES: Modality[] = ['masculino', 'femenino', 'mixto'];
const MASC_LEVELS = ['2da', '3ra', '4ta', '5ta', '6ta', '6ta/amigos'];
const FEM_LEVELS = ['A', 'B', 'C', 'D', 'E'];
const SEASONS: LeagueSeason[] = ['primavera', 'verano', 'otono', 'invierno'];

export function AdminDashboard() {
  const { signOut, user } = useAuth();
  const [tab, setTab] = useState<AdminTab>('leagues');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLeagues = useCallback(async () => {
    const { data } = await supabase.from('leagues').select('*').order('created_at', { ascending: false });
    setLeagues((data ?? []) as League[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadLeagues(); }, [loadLeagues]);

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId) ?? null;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top bar */}
      <header className="bg-white border-b border-ink-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-ink-900 leading-tight">Liga de Pádel</h1>
              <p className="text-xs text-ink-500 leading-tight">Panel de administración</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-500 hidden sm:block">{user?.email}</span>
            <button onClick={signOut} className="btn-secondary text-xs px-3 py-2">
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 overflow-x-auto border-b border-ink-200">
          <AdminTabBtn active={tab === 'leagues'} onClick={() => setTab('leagues')} icon={Trophy} label="Ligas" />
          {selectedLeague && (
            <>
              <AdminTabBtn active={tab === 'players'} onClick={() => setTab('players')} icon={Users} label="Jugadores" />
              <AdminTabBtn active={tab === 'pairs'} onClick={() => setTab('pairs')} icon={Users} label="Duplas" />
              <AdminTabBtn active={tab === 'fixture'} onClick={() => setTab('fixture')} icon={Calendar} label="Fixture" />
              <AdminTabBtn active={tab === 'results'} onClick={() => setTab('results')} icon={ChartColumn} label="Resultados" />
            </>
          )}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {tab === 'leagues' && (
              <LeaguesManager
                leagues={leagues}
                onReload={loadLeagues}
                selectedLeagueId={selectedLeagueId}
                onSelectLeague={(id) => { setSelectedLeagueId(id); setTab('players'); }}
              />
            )}
            {tab === 'players' && selectedLeague && (
              <PlayersManager />
            )}
            {tab === 'pairs' && selectedLeague && (
              <PairsManager league={selectedLeague} onGoToPlayers={() => setTab('players')} />
            )}
            {tab === 'fixture' && selectedLeague && (
              <FixtureManager league={selectedLeague} />
            )}
            {tab === 'results' && selectedLeague && (
              <ResultsManager league={selectedLeague} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminTabBtn({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: typeof Trophy; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
        active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ==================== LEAGUES MANAGER ====================
function LeaguesManager({ leagues, onReload, selectedLeagueId, onSelectLeague }: {
  leagues: League[];
  onReload: () => void;
  selectedLeagueId: string | null;
  onSelectLeague: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<League | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<League | null>(null);
  const [name, setName] = useState('');
  const [season, setSeason] = useState<LeagueSeason>('primavera');
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState<League['status']>('draft');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setSeason('primavera');
    setYear(new Date().getFullYear());
    setStatus('draft');
    setShowForm(true);
  };

  const openEdit = (l: League) => {
    setEditing(l);
    setName(l.name);
    setSeason(l.season);
    setYear(l.year);
    setStatus(l.status);
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    if (editing) {
      await supabase.from('leagues').update({ name, season, year, status }).eq('id', editing.id);
    } else {
      const { data } = await supabase.from('leagues').insert({ name, season, year, status }).select().single();
      if (data) onSelectLeague(data.id);
    }
    setSaving(false);
    setShowForm(false);
    onReload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('leagues').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    onReload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-ink-900">Ligas</h2>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nueva liga
        </button>
      </div>

      {leagues.length === 0 ? (
        <EmptyState icon={Trophy} title="No hay ligas" message="Crea la primera liga para empezar." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((l) => (
            <div
              key={l.id}
              className={`card p-5 cursor-pointer transition-all hover:shadow-card-hover ${
                selectedLeagueId === l.id ? 'ring-2 ring-brand-500' : ''
              }`}
              onClick={() => onSelectLeague(l.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-ink-900">{l.name}</h3>
                  <p className="text-xs text-ink-500 capitalize">{l.season} {l.year}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(l); }}
                  className="btn-secondary text-xs px-2.5 py-1.5"
                >
                  <Pencil className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(l); }}
                  className="btn-danger text-xs px-2.5 py-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar liga' : 'Nueva liga'}>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Liga Primavera 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Temporada</label>
              <select className="input" value={season} onChange={(e) => setSeason(e.target.value as LeagueSeason)}>
                {SEASONS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Año</label>
              <input type="number" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as League['status'])}>
              <option value="draft">Borrador</option>
              <option value="active">Activa</option>
              <option value="completed">Finalizada</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={save} disabled={saving || !name.trim()} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar liga"
        message={`¿Eliminar "${deleteTarget?.name}"? Se borrarán todas sus categorías, duplas y partidos. Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}

// ==================== PLAYERS MANAGER ====================
function PlayersManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCategories, setPlayerCategories] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [{ data }, { data: registrations }] = await Promise.all([
      supabase.from('players').select('*').order('last_name', { ascending: true }),
      supabase.from('player_category_registrations').select('player_id, categories(name)'),
    ]);
    setPlayers((data ?? []) as Player[]);
    const categoryMap = new Map<string, string[]>();
    (registrations ?? []).forEach((registration) => {
      const category = registration.categories as { name: string } | { name: string }[] | null;
      const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;
      if (!categoryName) return;
      categoryMap.set(registration.player_id, [...(categoryMap.get(registration.player_id) ?? []), categoryName]);
    });
    setPlayerCategories(categoryMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFirstName(''); setLastName(''); setPhone(''); setEmail('');
    setShowForm(true);
  };

  const openEdit = (p: Player) => {
    setEditing(p);
    setFirstName(p.first_name); setLastName(p.last_name);
    setPhone(p.phone ?? ''); setEmail(p.email ?? '');
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    if (editing) {
      await supabase.from('players').update({
        first_name: firstName, last_name: lastName, phone: phone || null, email: email || null,
      }).eq('id', editing.id);
    } else {
      await supabase.from('players').insert({
        first_name: firstName, last_name: lastName, phone: phone || null, email: email || null,
      });
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('players').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || (p.email ?? '').includes(q);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <h2 className="text-lg font-display font-semibold text-ink-900 whitespace-nowrap">Jugadores</h2>
        <div className="flex gap-2 flex-1 max-w-md">
          <input className="input" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button onClick={openCreate} className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
      </div>

      <p className="text-xs text-ink-500 mb-3">Los jugadores se registran una sola vez y pueden participar en cualquier liga.</p>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin jugadores" message="Agrega jugadores para poder formar duplas." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Teléfono</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink-900">{p.first_name} {p.last_name}</td>
                  <td className="px-4 py-3 text-ink-600 hidden sm:table-cell">{p.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600 hidden md:table-cell">{p.email ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600">{playerCategories.get(p.id)?.join(', ') ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-2 text-ink-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="p-2 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar jugador' : 'Nuevo jugador'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={save} disabled={saving || !firstName.trim() || !lastName.trim()} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar jugador"
        message={`¿Eliminar a ${deleteTarget?.first_name} ${deleteTarget?.last_name}? Si pertenece a una dupla, no se podrá eliminar.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}

// ==================== PAIRS MANAGER ====================
function PairsManager({ league, onGoToPlayers }: { league: League; onGoToPlayers: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catModality, setCatModality] = useState<Modality>('masculino');
  const [catLevel, setCatLevel] = useState('2da');
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [showPairForm, setShowPairForm] = useState(false);
  const [pairCategory, setPairCategory] = useState<string>('');
  const [pairName, setPairName] = useState('');
  const [pairP1, setPairP1] = useState('');
  const [pairP2, setPairP2] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletePairTarget, setDeletePairTarget] = useState<Pair | null>(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const [catsRes, playersRes] = await Promise.all([
      supabase.from('categories').select('*').eq('league_id', league.id).order('modality').order('level'),
      supabase.from('players').select('*').order('last_name'),
    ]);
    const cats = (catsRes.data ?? []) as Category[];
    setCategories(cats);
    setPlayers((playersRes.data ?? []) as Player[]);

    if (cats.length > 0) {
      const { data: pairsData } = await supabase.from('pairs').select('*').in('category_id', cats.map((c) => c.id));
      setPairs((pairsData ?? []) as Pair[]);
      setExpandedCats(new Set([cats[0].id]));
    } else {
      setPairs([]);
    }
    setLoading(false);
  }, [league.id]);

  useEffect(() => { load(); }, [load]);

  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    players.forEach((p) => m.set(p.id, p));
    return m;
  }, [players]);

  const pairsByCat = useMemo(() => {
    const m = new Map<string, Pair[]>();
    pairs.forEach((p) => {
      const arr = m.get(p.category_id) ?? [];
      arr.push(p);
      m.set(p.category_id, arr);
    });
    return m;
  }, [pairs]);

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const openCreateCat = () => {
    setEditingCat(null);
    setCatName(''); setCatModality('masculino'); setCatLevel('2da');
    setShowCatForm(true);
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatName(c.name); setCatModality(c.modality); setCatLevel(c.level);
    setShowCatForm(true);
  };

  const saveCat = async () => {
    setSaving(true);
    if (editingCat) {
      await supabase.from('categories').update({ name: catName, modality: catModality, level: catLevel }).eq('id', editingCat.id);
    } else {
      await supabase.from('categories').insert({ league_id: league.id, name: catName, modality: catModality, level: catLevel });
    }
    setSaving(false);
    setShowCatForm(false);
    load();
  };

  const playersUsedInLeague = useMemo(() => {
    const used = new Set<string>();
    pairs.forEach((p) => {
      used.add(p.player1_id);
      used.add(p.player2_id);
    });
    return used;
  }, [pairs]);

  const openCreatePair = (catId: string) => {
    setPairCategory(catId);
    setPairName(''); setPairP1(''); setPairP2('');
    setShowPairForm(true);
  };

  const savePair = async () => {
    if (!pairP1 || !pairP2 || pairP1 === pairP2) return;
    setSaving(true);
    const player1 = playerMap.get(pairP1);
    const player2 = playerMap.get(pairP2);
    const generatedName = `${player1?.first_name ?? ''} y ${player2?.first_name ?? ''}`.trim();
    await supabase.from('pairs').insert({
      category_id: pairCategory,
      name: pairName.trim() || generatedName,
      player1_id: pairP1,
      player2_id: pairP2,
    });
    setSaving(false);
    setShowPairForm(false);
    load();
  };

  const confirmDeletePair = async () => {
    if (!deletePairTarget) return;
    await supabase.from('pairs').delete().eq('id', deletePairTarget.id);
    setDeletePairTarget(null);
    load();
  };

  const confirmDeleteCat = async () => {
    if (!deleteCatTarget) return;
    await supabase.from('categories').delete().eq('id', deleteCatTarget.id);
    setDeleteCatTarget(null);
    load();
  };

  const levelOptions = catModality === 'femenino' ? FEM_LEVELS : MASC_LEVELS;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-ink-900">Categorías y Duplas</h2>
        <button onClick={openCreateCat} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva categoría
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={Trophy} title="Sin categorías" message="Crea categorías para esta liga (ej: Masculino 2da, Femenino A)." />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isOpen = expandedCats.has(cat.id);
            const catPairs = pairsByCat.get(cat.id) ?? [];
            return (
              <div key={cat.id} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <button onClick={() => toggleCat(cat.id)} className="flex items-center gap-3 flex-1 text-left">
                    {isOpen ? <ChevronDown className="w-5 h-5 text-ink-400" /> : <ChevronRight className="w-5 h-5 text-ink-400" />}
                    <div>
                      <h3 className="font-display font-semibold text-ink-900">{cat.name}</h3>
                      <p className="text-xs text-ink-500 capitalize">{cat.modality} · {cat.level} · {catPairs.length} duplas</p>
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => openEditCat(cat)} className="p-2 text-ink-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteCatTarget(cat)} className="p-2 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-ink-100 animate-slide-up">
                    {catPairs.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="text-sm text-ink-500 mb-3">Sin duplas en esta categoría</p>
                        <button onClick={() => openCreatePair(cat.id)} className="btn-accent text-xs">
                          <Plus className="w-3 h-3" /> Agregar dupla
                        </button>
                      </div>
                    ) : (
                      <>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wide">
                              <th className="px-4 py-2 text-left font-semibold">Dupla</th>
                              <th className="px-4 py-2 text-left font-semibold hidden sm:table-cell">Jugador 1</th>
                              <th className="px-4 py-2 text-left font-semibold hidden sm:table-cell">Jugador 2</th>
                              <th className="px-4 py-2 text-right font-semibold">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ink-100">
                            {catPairs.map((pair) => (
                              <tr key={pair.id} className="hover:bg-ink-50 transition-colors">
                                <td className="px-4 py-2.5 font-medium text-ink-900">{pair.name}</td>
                                <td className="px-4 py-2.5 text-ink-600 hidden sm:table-cell">
                                  {playerMap.get(pair.player1_id) ? `${playerMap.get(pair.player1_id)!.first_name} ${playerMap.get(pair.player1_id)!.last_name}` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-ink-600 hidden sm:table-cell">
                                  {playerMap.get(pair.player2_id) ? `${playerMap.get(pair.player2_id)!.first_name} ${playerMap.get(pair.player2_id)!.last_name}` : '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <button onClick={() => setDeletePairTarget(pair)} className="p-2 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto block">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="px-4 py-3 border-t border-ink-100">
                          <button onClick={() => openCreatePair(cat.id)} className="btn-accent text-xs">
                            <Plus className="w-3 h-3" /> Agregar dupla
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {players.length === 0 && (
        <div className="mt-4 p-4 bg-accent-50 border border-accent-200 rounded-lg text-sm text-accent-800 flex items-center justify-between">
          <span>Necesitas registrar jugadores antes de crear duplas.</span>
          <button onClick={onGoToPlayers} className="btn-accent text-xs">Ir a jugadores</button>
        </div>
      )}

      {/* Category modal */}
      <Modal open={showCatForm} onClose={() => setShowCatForm(false)} title={editingCat ? 'Editar categoría' : 'Nueva categoría'}>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ej: Masculino 2da" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Modalidad</label>
              <select className="input" value={catModality} onChange={(e) => {
                setCatModality(e.target.value as Modality);
                setCatLevel(e.target.value === 'femenino' ? FEM_LEVELS[0] : MASC_LEVELS[0]);
              }}>
                {MODALITIES.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nivel</label>
              <select className="input" value={catLevel} onChange={(e) => setCatLevel(e.target.value)}>
                {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowCatForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={saveCat} disabled={saving || !catName.trim()} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Pair modal */}
      <Modal open={showPairForm} onClose={() => setShowPairForm(false)} title="Nueva dupla">
        <div className="space-y-4">
          <p className="text-sm text-ink-500">El nombre se completará automáticamente con los nombres de los jugadores si lo dejas vacío.</p>
          <div>
            <label className="label">Jugador 1</label>
            <select className="input" value={pairP1} onChange={(e) => setPairP1(e.target.value)}>
              <option value="">Seleccionar...</option>
              {players.filter((p) => !playersUsedInLeague.has(p.id) || p.id === pairP1).map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Jugador 2</label>
            <select className="input" value={pairP2} onChange={(e) => setPairP2(e.target.value)}>
              <option value="">Seleccionar...</option>
              {players.filter((p) =>
                p.id !== pairP1 && (!playersUsedInLeague.has(p.id) || p.id === pairP2)
              ).map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
            {(pairP1 && playersUsedInLeague.has(pairP1)) && (
              <p className="text-xs text-accent-600 mt-1">Este jugador ya está en una dupla de esta liga.</p>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowPairForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={savePair} disabled={saving || !pairP1 || !pairP2 || pairP1 === pairP2} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deletePairTarget} title="Eliminar dupla" message={`¿Eliminar la dupla "${deletePairTarget?.name}"?`} onConfirm={confirmDeletePair} onCancel={() => setDeletePairTarget(null)} confirmLabel="Eliminar" danger />
      <ConfirmDialog open={!!deleteCatTarget} title="Eliminar categoría" message={`¿Eliminar "${deleteCatTarget?.name}"? Se borrarán todas sus duplas y partidos.`} onConfirm={confirmDeleteCat} onCancel={() => setDeleteCatTarget(null)} confirmLabel="Eliminar" danger />
    </div>
  );
}

// ==================== FIXTURE MANAGER ====================
function FixtureManager({ league }: { league: League }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<string | null>(null);
  const [clearing, setClearing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: cats } = await supabase.from('categories').select('*').eq('league_id', league.id).order('modality').order('level');
    const cs = (cats ?? []) as Category[];
    setCategories(cs);
    if (cs.length > 0) {
      const [pairsRes, matchesRes] = await Promise.all([
        supabase.from('pairs').select('*').in('category_id', cs.map((c) => c.id)),
        supabase.from('matches').select('*').in('category_id', cs.map((c) => c.id)).order('round'),
      ]);
      setPairs((pairsRes.data ?? []) as Pair[]);
      setMatches((matchesRes.data ?? []) as Match[]);
      setExpandedCats(new Set([cs[0].id]));
    } else {
      setPairs([]); setMatches([]);
    }
    setLoading(false);
  }, [league.id]);

  useEffect(() => { load(); }, [load]);

  const pairsByCat = useMemo(() => {
    const m = new Map<string, Pair[]>();
    pairs.forEach((p) => { const a = m.get(p.category_id) ?? []; a.push(p); m.set(p.category_id, a); });
    return m;
  }, [pairs]);

  const matchesByCat = useMemo(() => {
    const m = new Map<string, Match[]>();
    matches.forEach((m2) => { const a = m.get(m2.category_id) ?? []; a.push(m2); m.set(m2.category_id, a); });
    return m;
  }, [matches]);

  const pairMap = useMemo(() => {
    const m = new Map<string, Pair>();
    pairs.forEach((p) => m.set(p.id, p));
    return m;
  }, [pairs]);

  const generateFixture = async (catId: string) => {
    const catPairs = pairsByCat.get(catId) ?? [];
    if (catPairs.length < 2) return;
    setGenerating(catId);
    const games = generateRoundRobin(catPairs.length);
    const rows = games.map((g) => ({
      category_id: catId,
      round: g.round,
      pair1_id: catPairs[g.pair1_index].id,
      pair2_id: catPairs[g.pair2_index].id,
      status: 'scheduled' as const,
    }));
    await supabase.from('matches').delete().eq('category_id', catId);
    await supabase.from('matches').insert(rows);
    setGenerating(null);
    load();
  };

  const clearFixture = async (catId: string) => {
    setClearing(catId);
    await supabase.from('matches').delete().eq('category_id', catId);
    setClearing(null);
    load();
  };

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2 className="text-lg font-display font-semibold text-ink-900 mb-4">Fixture</h2>

      {categories.length === 0 ? (
        <EmptyState icon={Calendar} title="Sin categorías" message="Crea categorías y duplas primero." />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isOpen = expandedCats.has(cat.id);
            const catPairs = pairsByCat.get(cat.id) ?? [];
            const catMatches = matchesByCat.get(cat.id) ?? [];
            const hasFixture = catMatches.length > 0;
            return (
              <div key={cat.id} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <button onClick={() => toggleCat(cat.id)} className="flex items-center gap-3 flex-1 text-left">
                    {isOpen ? <ChevronDown className="w-5 h-5 text-ink-400" /> : <ChevronRight className="w-5 h-5 text-ink-400" />}
                    <div>
                      <h3 className="font-display font-semibold text-ink-900">{cat.name}</h3>
                      <p className="text-xs text-ink-500">{catPairs.length} duplas · {catMatches.length} partidos</p>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    {!hasFixture ? (
                      <button
                        onClick={() => generateFixture(cat.id)}
                        disabled={catPairs.length < 2 || generating === cat.id}
                        className="btn-accent text-xs"
                      >
                        <Zap className="w-3 h-3" />
                        {generating === cat.id ? 'Generando...' : 'Generar fixture'}
                      </button>
                    ) : (
                      <button
                        onClick={() => clearFixture(cat.id)}
                        disabled={clearing === cat.id}
                        className="btn-danger text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                        {clearing === cat.id ? 'Limpiando...' : 'Limpiar'}
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && hasFixture && (
                  <div className="border-t border-ink-100 px-5 py-4 animate-slide-up">
                    <ScheduleEditor matches={catMatches} pairMap={pairMap} onUpdated={load} />
                  </div>
                )}
                {isOpen && !hasFixture && catPairs.length < 2 && (
                  <div className="border-t border-ink-100 px-5 py-4 text-sm text-ink-500">
                    Necesitas al menos 2 duplas para generar el fixture.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScheduleEditor({ matches, pairMap, onUpdated }: {
  matches: Match[];
  pairMap: Map<string, Pair>;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverRound, setDragOverRound] = useState<number | null>(null);

  const byRound = new Map<number, Match[]>();
  matches.forEach((m) => { const a = byRound.get(m.round) ?? []; a.push(m); byRound.set(m.round, a); });
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);

  const updateDate = async (matchId: string, dateStr: string) => {
    setSaving(matchId);
    const scheduled_date = dateStr ? new Date(dateStr + 'T00:00:00').toISOString() : null;
    await supabase.from('matches').update({ scheduled_date }).eq('id', matchId);
    setSaving(null);
    onUpdated();
  };

  const moveToRound = async (matchId: string, newRound: number) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match || match.round === newRound) return;
    setSaving(matchId);
    await supabase.from('matches').update({ round: newRound }).eq('id', matchId);
    setSaving(null);
    setDragId(null);
    setDragOverRound(null);
    onUpdated();
  };

  const toDateInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  };

  const roundLabel = (r: number) => r >= 100 ? 'Cuadrangular' : `Fecha ${r}`;

  return (
    <div>
      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">Arrastra los partidos entre las fechas</p>
      <p className="text-xs text-ink-400 mb-3">Mantén presionado y arrastra la tarjeta del partido a la fecha donde quieras reprogramarla.</p>
      <div className="space-y-3">
        {rounds.map((round) => {
          const isDropTarget = dragOverRound === round && dragId !== null;
          const roundMatches = byRound.get(round)!;
          return (
            <div
              key={round}
              onDragOver={(e) => { e.preventDefault(); if (dragId && dragOverRound !== round) setDragOverRound(round); }}
              onDragLeave={(e) => { if (dragOverRound === round) setDragOverRound(null); }}
              onDrop={(e) => { e.preventDefault(); if (dragId) moveToRound(dragId, round); }}
              className={`rounded-lg border-2 p-3 transition-all ${
                isDropTarget
                  ? 'border-brand-500 bg-brand-50/60'
                  : 'border-ink-100 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs font-display font-semibold text-ink-700">{roundLabel(round)}</h4>
                <span className="text-xs text-ink-400">· {roundMatches.length} partidos</span>
                {roundMatches.some((m) => m.scheduled_date) && (
                  <span className="text-xs text-ink-500 ml-auto">
                    {new Date(roundMatches.find((m) => m.scheduled_date)!.scheduled_date!).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {roundMatches.map((m) => {
                  const p1 = pairMap.get(m.pair1_id)?.name ?? '—';
                  const p2 = pairMap.get(m.pair2_id)?.name ?? '—';
                  const isDragging = dragId === m.id;
                  return (
                    <div
                      key={m.id}
                      draggable={saving === null}
                      onDragStart={() => setDragId(m.id)}
                      onDragEnd={() => { setDragId(null); setDragOverRound(null); }}
                      className={`group flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing transition-all ${
                        isDragging ? 'opacity-40 ring-2 ring-brand-400' : 'bg-ink-50 hover:bg-ink-100'
                      } ${saving === m.id ? 'pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-ink-300 flex-shrink-0 group-hover:text-ink-500 transition-colors" />
                        <div className="min-w-0 text-xs">
                          <span className="font-medium text-ink-800 truncate">{p1}</span>
                          <span className="text-ink-400 mx-1">vs</span>
                          <span className="font-medium text-ink-800 truncate">{p2}</span>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          className="input text-xs py-1.5 w-auto"
                          value={toDateInput(m.scheduled_date)}
                          onChange={(e) => updateDate(m.id, e.target.value)}
                          disabled={saving === m.id}
                        />
                        {saving === m.id && <span className="text-xs text-ink-400">Guardando...</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== RESULTS MANAGER ====================
function ResultsManager({ league }: { league: League }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [sets, setSets] = useState<MatchSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editSets, setEditSets] = useState<Array<{ id?: string; pair1_games: number; pair2_games: number }>>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: cats } = await supabase.from('categories').select('*').eq('league_id', league.id).order('modality').order('level');
    const cs = (cats ?? []) as Category[];
    setCategories(cs);
    if (cs.length > 0) {
      const catIds = cs.map((c) => c.id);
      const [pairsRes, matchesRes] = await Promise.all([
        supabase.from('pairs').select('*').in('category_id', catIds),
        supabase.from('matches').select('*').in('category_id', catIds).order('round'),
      ]);
      const ms = (matchesRes.data ?? []) as Match[];
      setPairs((pairsRes.data ?? []) as Pair[]);
      setMatches(ms);
      if (ms.length > 0) {
        const { data: setsData } = await supabase.from('match_sets').select('*').in('match_id', ms.map((m) => m.id));
        setSets((setsData ?? []) as MatchSet[]);
      } else {
        setSets([]);
      }
      setExpandedCats(new Set([cs[0].id]));
    } else {
      setPairs([]); setMatches([]); setSets([]);
    }
    setLoading(false);
  }, [league.id]);

  useEffect(() => { load(); }, [load]);

  const matchesByCat = useMemo(() => {
    const m = new Map<string, Match[]>();
    matches.forEach((m2) => { const a = m.get(m2.category_id) ?? []; a.push(m2); m.set(m2.category_id, a); });
    return m;
  }, [matches]);

  const setsByMatch = useMemo(() => {
    const m = new Map<string, MatchSet[]>();
    sets.forEach((s) => { const a = m.get(s.match_id) ?? []; a.push(s); m.set(s.match_id, a); });
    return m;
  }, [sets]);

  const pairMap = useMemo(() => {
    const m = new Map<string, Pair>();
    pairs.forEach((p) => m.set(p.id, p));
    return m;
  }, [pairs]);

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const openEdit = (match: Match) => {
    setEditingMatch(match);
    const matchSets = (setsByMatch.get(match.id) ?? []).sort((a, b) => a.set_number - b.set_number);
    if (matchSets.length > 0) {
      setEditSets(matchSets.map((s) => ({ id: s.id, pair1_games: s.pair1_games, pair2_games: s.pair2_games })));
    } else {
      setEditSets([{ pair1_games: 0, pair2_games: 0 }, { pair1_games: 0, pair2_games: 0 }]);
    }
  };

  const addSet = () => setEditSets((prev) => [...prev, { pair1_games: 0, pair2_games: 0 }]);
  const removeSet = (idx: number) => setEditSets((prev) => prev.filter((_, i) => i !== idx));
  const updateSet = (idx: number, field: 'pair1_games' | 'pair2_games', val: number) => {
    setEditSets((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: Math.max(0, val) } : s));
  };

  const saveResult = async () => {
    if (!editingMatch) return;
    setSaving(true);
    const validSets = editSets.filter((s) => s.pair1_games > 0 || s.pair2_games > 0);
    const hasResult = validSets.length > 0;

    await supabase.from('matches').update({ status: hasResult ? 'played' : 'scheduled' }).eq('id', editingMatch.id);

    if (editingMatch.id) {
      await supabase.from('match_sets').delete().eq('match_id', editingMatch.id);
    }
    if (hasResult) {
      const rows = validSets.map((s, i) => ({
        match_id: editingMatch.id,
        set_number: i + 1,
        pair1_games: s.pair1_games,
        pair2_games: s.pair2_games,
      }));
      await supabase.from('match_sets').insert(rows);
    }

    setSaving(false);
    setEditingMatch(null);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2 className="text-lg font-display font-semibold text-ink-900 mb-4">Resultados</h2>

      {categories.length === 0 ? (
        <EmptyState icon={ChartColumn} title="Sin categorías" message="Crea categorías y genera el fixture primero." />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isOpen = expandedCats.has(cat.id);
            const catMatches = matchesByCat.get(cat.id) ?? [];
            return (
              <div key={cat.id} className="card overflow-hidden">
                <button onClick={() => toggleCat(cat.id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-ink-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-5 h-5 text-ink-400" /> : <ChevronRight className="w-5 h-5 text-ink-400" />}
                    <div className="text-left">
                      <h3 className="font-display font-semibold text-ink-900">{cat.name}</h3>
                      <p className="text-xs text-ink-500">{catMatches.length} partidos · {catMatches.filter((m) => m.status === 'played').length} jugados</p>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-ink-100 animate-slide-up">
                    {catMatches.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-ink-500">Genera el fixture primero.</div>
                    ) : (
                      <div className="divide-y divide-ink-100">
                        {catMatches.map((m) => {
                          const ms = (setsByMatch.get(m.id) ?? []).sort((a, b) => a.set_number - b.set_number);
                          const p1 = pairMap.get(m.pair1_id);
                          const p2 = pairMap.get(m.pair2_id);
                          return (
                            <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50 transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-xs text-ink-400 w-16">{m.round >= 100 ? 'Cuad.' : `F${m.round}`}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-ink-800 truncate">{p1?.name ?? '—'} vs {p2?.name ?? '—'}</div>
                                  {ms.length > 0 && (
                                    <div className="text-xs text-ink-500 mt-0.5">
                                      {ms.map((s) => `${s.pair1_games}-${s.pair2_games}`).join('  ')}
                                    </div>
                                  )}
                                </div>
                                <StatusBadge status={m.status} />
                              </div>
                              <button onClick={() => openEdit(m)} className="btn-secondary text-xs ml-3 px-2.5 py-1.5 whitespace-nowrap">
                                <ListChecks className="w-3 h-3" /> Registrar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Result editor modal */}
      <Modal
        open={!!editingMatch}
        onClose={() => setEditingMatch(null)}
        title="Registrar resultado"
        maxWidth="max-w-md"
      >
        {editingMatch && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium text-ink-900 bg-ink-50 rounded-lg px-4 py-3">
              <span>{pairMap.get(editingMatch.pair1_id)?.name ?? '—'}</span>
              <span className="text-ink-400 text-xs">vs</span>
              <span>{pairMap.get(editingMatch.pair2_id)?.name ?? '—'}</span>
            </div>

            <div className="space-y-2">
              <label className="label">Sets</label>
              {editSets.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-ink-400 w-12">Set {i + 1}</span>
                  <input
                    type="number"
                    min="0"
                    className="input text-center w-20"
                    value={s.pair1_games}
                    onChange={(e) => updateSet(i, 'pair1_games', Number(e.target.value))}
                  />
                  <span className="text-ink-400">-</span>
                  <input
                    type="number"
                    min="0"
                    className="input text-center w-20"
                    value={s.pair2_games}
                    onChange={(e) => updateSet(i, 'pair2_games', Number(e.target.value))}
                  />
                  {editSets.length > 1 && (
                    <button onClick={() => removeSet(i)} className="p-1.5 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addSet} className="btn-secondary text-xs mt-2">
                <Plus className="w-3 h-3" /> Agregar set
              </button>
            </div>

            <p className="text-xs text-ink-400">Deja ambos games en 0 para marcar como no jugado.</p>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditingMatch(null)} className="btn-secondary">Cancelar</button>
              <button onClick={saveResult} disabled={saving} className="btn-primary">
                {saving ? 'Guardando...' : 'Guardar resultado'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
