import { useEffect, useState, useMemo } from 'react';
import {
  Trophy, Calendar, ChartColumn, Users, ChevronDown, ChevronRight, MapPin, CheckCircle,
  Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateStandings } from '@/lib/standings';
import { StatusBadge, LoadingSpinner, EmptyState, Modal } from '@/components/ui';
import type {
  League, Category, Pair, Match, MatchSet, Player,
} from '@/types';

type Tab = 'standings' | 'results' | 'fixture';

export function PublicView() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>('standings');
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [registrationError, setRegistrationError] = useState('');
  const [registrationForm, setRegistrationForm] = useState({ firstName: '', lastName: '', phone: '', email: '', categoryId: '' });
  const [fixtureSearch, setFixtureSearch] = useState('');
  const [data, setData] = useState<{
    pairs: Pair[];
    players: Player[];
    matches: Match[];
    sets: MatchSet[];
  }>({ pairs: [], players: [], matches: [], sets: [] });

  useEffect(() => {
    (async () => {
      const { data: leaguesData } = await supabase
        .from('leagues')
        .select('*')
        .order('created_at', { ascending: false });
      if (leaguesData && leaguesData.length > 0) {
        setLeagues(leaguesData as League[]);
        setSelectedLeagueId(leaguesData[0].id);
      } else {
        setLeagues([]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedLeagueId) return;
    setLoading(true);
    (async () => {
      const { data: catsData } = await supabase
        .from('categories')
        .select('*')
        .eq('league_id', selectedLeagueId)
        .order('modality', { ascending: true })
        .order('level', { ascending: true });

      const cats = (catsData ?? []) as Category[];
      setCategories(cats);

      if (cats.length === 0) {
        setData({ pairs: [], players: [], matches: [], sets: [] });
        setLoading(false);
        return;
      }

      const catIds = cats.map((c) => c.id);

      const [pairsRes, matchesRes] = await Promise.all([
        supabase.from('pairs').select('*').in('category_id', catIds),
        supabase.from('matches').select('*').in('category_id', catIds).order('round', { ascending: true }),
      ]);

      const pairs = (pairsRes.data ?? []) as Pair[];
      const matches = (matchesRes.data ?? []) as Match[];
      const matchIds = matches.map((m) => m.id);

      const [playersRes, setsRes] = await Promise.all([
        supabase.from('players').select('*').in(
          'id',
          Array.from(new Set(pairs.flatMap((p) => [p.player1_id, p.player2_id])))
        ),
        supabase.from('match_sets').select('*').in('match_id', matchIds.length ? matchIds : ['00000000-0000-0000-0000-000000000000']),
      ]);

      setData({
        pairs,
        players: (playersRes.data ?? []) as Player[],
        matches,
        sets: (setsRes.data ?? []) as MatchSet[],
      });
      setExpandedCategories(new Set([cats[0]?.id].filter(Boolean) as string[]));
      setLoading(false);
    })();
  }, [selectedLeagueId]);

  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    data.players.forEach((p) => m.set(p.id, p));
    return m;
  }, [data.players]);

  const pairsByCategory = useMemo(() => {
    const m = new Map<string, Pair[]>();
    data.pairs.forEach((p) => {
      const arr = m.get(p.category_id) ?? [];
      arr.push(p);
      m.set(p.category_id, arr);
    });
    return m;
  }, [data.pairs]);

  const matchesByCategory = useMemo(() => {
    const m = new Map<string, Match[]>();
    data.matches.forEach((match) => {
      const arr = m.get(match.category_id) ?? [];
      arr.push(match);
      m.set(match.category_id, arr);
    });
    return m;
  }, [data.matches]);

  const setsByMatchId = useMemo(() => {
    const m = new Map<string, MatchSet[]>();
    data.sets.forEach((s) => {
      const arr = m.get(s.match_id) ?? [];
      arr.push(s);
      m.set(s.match_id, arr);
    });
    return m;
  }, [data.sets]);

  const pairMap = useMemo(() => {
    const m = new Map<string, Pair>();
    data.pairs.forEach((p) => m.set(p.id, p));
    return m;
  }, [data.pairs]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const submitRegistration = async () => {
    if (!registrationForm.firstName.trim() || !registrationForm.lastName.trim()) return;
    setRegistrationStatus('saving');
    setRegistrationError('');
    const { data: player, error: playerError } = await supabase.from('players').insert({
      first_name: registrationForm.firstName.trim(),
      last_name: registrationForm.lastName.trim(),
      phone: registrationForm.phone.trim() || null,
      email: registrationForm.email.trim() || null,
    }).select().maybeSingle();

    if (playerError || !player) {
      setRegistrationStatus('error');
      setRegistrationError('No pudimos completar el registro. Revisa tus datos e inténtalo nuevamente.');
      return;
    }

    if (registrationForm.categoryId) {
      const { error: categoryError } = await supabase.from('player_category_registrations').insert({
        player_id: player.id,
        category_id: registrationForm.categoryId,
      });
      if (categoryError) {
        setRegistrationStatus('error');
        setRegistrationError('El registro se guardó, pero no pudimos asociar la categoría.');
        return;
      }
    }

    setRegistrationStatus('success');
    setRegistrationForm({ firstName: '', lastName: '', phone: '', email: '', categoryId: '' });
  };

  const closeRegistration = () => {
    setShowRegistration(false);
    setRegistrationStatus('idle');
    setRegistrationError('');
  };

  const activeLeagues = leagues.filter((l) => l.status === 'active');
  const draftLeagues = leagues.filter((l) => l.status === 'draft');
  const completedLeagues = leagues.filter((l) => l.status === 'completed');

  if (loading && leagues.length === 0) return <LoadingSpinner />;

  if (leagues.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Aún no hay ligas registradas"
        message="Las ligas aparecerán aquí una vez que el administrador las cree."
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* League selector */}
      <div className="mb-8">
        <label className="label">Seleccionar liga</label>
        <div className="flex flex-wrap gap-2">
          {activeLeagues.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              {activeLeagues.map((l) => (
                <LeaguePill key={l.id} league={l} selected={selectedLeagueId === l.id} onClick={() => setSelectedLeagueId(l.id)} />
              ))}
            </div>
          )}
          {draftLeagues.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              {draftLeagues.map((l) => (
                <LeaguePill key={l.id} league={l} selected={selectedLeagueId === l.id} onClick={() => setSelectedLeagueId(l.id)} />
              ))}
            </div>
          )}
          {completedLeagues.length > 0 && (
            <div className="flex items-center gap-2">
              {completedLeagues.map((l) => (
                <LeaguePill key={l.id} league={l} selected={selectedLeagueId === l.id} onClick={() => setSelectedLeagueId(l.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-ink-200">
        <TabButton active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} icon={ChartColumn} label="Tabla de Posiciones" />
        <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={Trophy} label="Resultados" />
        <TabButton active={activeTab === 'fixture'} onClick={() => setActiveTab('fixture')} icon={Calendar} label="Fixture" />
      </div>

      {activeTab === 'fixture' && categories.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Buscar dupla... (ej: Gonzalo y Gonzalo)"
            value={fixtureSearch}
            onChange={(e) => setFixtureSearch(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : categories.length === 0 ? (
        <EmptyState icon={Users} title="Sin categorías" message="Esta liga aún no tiene categorías registradas." />
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const isOpen = expandedCategories.has(cat.id);
            const catPairs = pairsByCategory.get(cat.id) ?? [];
            const allCatMatches = matchesByCategory.get(cat.id) ?? [];
            const q = fixtureSearch.trim().toLowerCase();
            const catMatches = q
              ? allCatMatches.filter((m) => {
                  const p1 = pairMap.get(m.pair1_id)?.name?.toLowerCase() ?? '';
                  const p2 = pairMap.get(m.pair2_id)?.name?.toLowerCase() ?? '';
                  return p1.includes(q) || p2.includes(q);
                })
              : allCatMatches;
            if (q && catMatches.length === 0) return null;
            return (
              <div key={cat.id} className="card overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-ink-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-5 h-5 text-ink-400" /> : <ChevronRight className="w-5 h-5 text-ink-400" />}
                    <div className="text-left">
                      <h3 className="font-display font-semibold text-ink-900">{cat.name}</h3>
                      <p className="text-xs text-ink-500 capitalize">{cat.modality} · {cat.level}</p>
                    </div>
                  </div>
                  <span className="text-xs text-ink-400">{catPairs.length} duplas · {catMatches.length} partidos</span>
                </button>

                {isOpen && (
                  <div className="border-t border-ink-100 animate-slide-up">
                    {activeTab === 'standings' && (
                      <StandingsTable
                        pairs={catPairs}
                        matches={catMatches}
                        sets={data.sets.filter((s) => catMatches.some((m) => m.id === s.match_id))}
                        playerMap={playerMap}
                      />
                    )}
                    {activeTab === 'results' && (
                      <ResultsList matches={catMatches} setsByMatchId={setsByMatchId} pairMap={pairMap} />
                    )}
                    {activeTab === 'fixture' && (
                      <FixtureList matches={catMatches} setsByMatchId={setsByMatchId} pairMap={pairMap} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 shadow-lg">
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-8 sm:px-10">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">Regístrate para jugar</h2>
            <p className="text-sm text-brand-100">Únete a la comunidad de pádel y participa en las próximas ligas.</p>
          </div>
          <button onClick={() => setShowRegistration(true)} className="bg-white text-brand-700 font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:bg-brand-50 transition-all whitespace-nowrap">
            Quiero participar
          </button>
        </div>
      </div>

      <Modal open={showRegistration} onClose={closeRegistration} title="Quiero participar">
        {registrationStatus === 'success' ? (
          <div className="py-6 text-center">
            <CheckCircle className="w-12 h-12 text-brand-600 mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold text-ink-900">¡Registro recibido!</h3>
            <p className="text-sm text-ink-500 mt-2">Tus datos fueron enviados correctamente.</p>
            <button onClick={closeRegistration} className="btn-primary mt-6">Cerrar</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">Completa tus datos y, si quieres, elige una categoría.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Nombre</label><input className="input" value={registrationForm.firstName} onChange={(e) => setRegistrationForm((current) => ({ ...current, firstName: e.target.value }))} /></div>
              <div><label className="label">Apellido</label><input className="input" value={registrationForm.lastName} onChange={(e) => setRegistrationForm((current) => ({ ...current, lastName: e.target.value }))} /></div>
            </div>
            <div><label className="label">Teléfono</label><input className="input" value={registrationForm.phone} onChange={(e) => setRegistrationForm((current) => ({ ...current, phone: e.target.value }))} placeholder="+56 9 1234 5678" /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={registrationForm.email} onChange={(e) => setRegistrationForm((current) => ({ ...current, email: e.target.value }))} /></div>
            <div>
              <label className="label">Categoría <span className="font-normal text-ink-400">(opcional)</span></label>
              <select className="input" value={registrationForm.categoryId} onChange={(e) => setRegistrationForm((current) => ({ ...current, categoryId: e.target.value }))}>
                <option value="">Aún no lo sé</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name} · {category.modality} {category.level}</option>)}
              </select>
            </div>
            {registrationStatus === 'error' && <p className="text-sm text-red-600">{registrationError}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeRegistration} className="btn-secondary">Cancelar</button>
              <button onClick={submitRegistration} disabled={registrationStatus === 'saving' || !registrationForm.firstName.trim() || !registrationForm.lastName.trim()} className="btn-primary">
                {registrationStatus === 'saving' ? 'Enviando...' : 'Enviar registro'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LeaguePill({ league, selected, onClick }: { league: League; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        selected
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-white text-ink-700 border border-ink-200 hover:border-brand-300 hover:text-brand-700'
      }`}
    >
      {league.name}
      <span className="ml-2 opacity-70">·</span>
      <span className="ml-1 capitalize">{league.season}</span>
      <span className="ml-1 opacity-70">{league.year}</span>
    </button>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Trophy; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
        active
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function StandingsTable({ pairs, matches, sets, playerMap }: {
  pairs: Pair[];
  matches: Match[];
  sets: MatchSet[];
  playerMap: Map<string, Player>;
}) {
  if (pairs.length === 0) {
    return <EmptyState icon={Users} title="Sin duplas" message="Aún no se han registrado duplas en esta categoría." />;
  }

  const pairInfos = pairs.map((p) => ({
    id: p.id,
    name: p.name,
    player1_name: `${playerMap.get(p.player1_id)?.first_name ?? ''} ${playerMap.get(p.player1_id)?.last_name ?? ''}`,
    player2_name: `${playerMap.get(p.player2_id)?.first_name ?? ''} ${playerMap.get(p.player2_id)?.last_name ?? ''}`,
  }));

  const standings = calculateStandings(matches, sets, pairInfos);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wide">
            <th className="px-3 py-3 text-left font-semibold">#</th>
            <th className="px-3 py-3 text-left font-semibold">Dupla</th>
            <th className="px-3 py-3 text-center font-semibold">PJ</th>
            <th className="px-3 py-3 text-center font-semibold">PG</th>
            <th className="px-3 py-3 text-center font-semibold">PP</th>
            <th className="px-3 py-3 text-center font-semibold">Sets</th>
            <th className="px-3 py-3 text-center font-semibold">Games</th>
            <th className="px-3 py-3 text-center font-semibold">Dif</th>
            <th className="px-3 py-3 text-center font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {standings.map((row, i) => (
            <tr key={row.pair_id} className={`hover:bg-ink-50 transition-colors ${i < 4 ? 'bg-brand-50/30' : ''}`}>
              <td className="px-3 py-3 text-center font-semibold text-ink-700">{i + 1}</td>
              <td className="px-3 py-3">
                <div className="font-medium text-ink-900">{row.player1_name} / {row.player2_name}</div>
              </td>
              <td className="px-3 py-3 text-center text-ink-700">{row.matches_played}</td>
              <td className="px-3 py-3 text-center text-brand-700 font-medium">{row.matches_won}</td>
              <td className="px-3 py-3 text-center text-ink-500">{row.matches_lost}</td>
              <td className="px-3 py-3 text-center text-ink-700">{row.sets_won}-{row.sets_lost}</td>
              <td className="px-3 py-3 text-center text-ink-700">{row.games_won}-{row.games_lost}</td>
              <td className={`px-3 py-3 text-center font-medium ${row.games_diff > 0 ? 'text-brand-700' : row.games_diff < 0 ? 'text-red-600' : 'text-ink-500'}`}>
                {row.games_diff > 0 ? '+' : ''}{row.games_diff}
              </td>
              <td className="px-3 py-3 text-center">
                <span className="font-display font-bold text-base text-ink-900">{row.points}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 text-xs text-ink-400 border-t border-ink-100">
        Orden: Puntos → Diferencia de sets → Diferencia de juegos. PJ=Partidos jugados, PG=Ganados, PP=Perdidos
      </div>
    </div>
  );
}

function ResultsList({ matches, setsByMatchId, pairMap }: {
  matches: Match[];
  setsByMatchId: Map<string, MatchSet[]>;
  pairMap: Map<string, Pair>;
}) {
  const played = matches.filter((m) => m.status === 'played').sort((a, b) => {
    const da = a.scheduled_date ?? a.created_at;
    const db = b.scheduled_date ?? b.created_at;
    return db.localeCompare(da);
  });

  if (played.length === 0) {
    return <EmptyState icon={Trophy} title="Sin resultados" message="Aún no se han registrado resultados en esta categoría." />;
  }

  return (
    <div className="divide-y divide-ink-100">
      {played.map((m) => {
        const ms = (setsByMatchId.get(m.id) ?? []).sort((a, b) => a.set_number - b.set_number);
        const p1 = pairMap.get(m.pair1_id);
        const p2 = pairMap.get(m.pair2_id);
        let p1Sets = 0, p2Sets = 0;
        ms.forEach((s) => {
          if (s.pair1_games > s.pair2_games) p1Sets++;
          else if (s.pair2_games > s.pair1_games) p2Sets++;
        });
        const p1Won = p1Sets > p2Sets;

        return (
          <div key={m.id} className="px-5 py-4 hover:bg-ink-50 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${p1Won ? 'text-brand-700' : 'text-ink-600'}`}>
                  {p1?.name ?? '—'}
                  {p1Won && <span className="ml-2 text-xs text-brand-600 font-bold">G</span>}
                </div>
                <div className={`font-medium truncate ${!p1Won ? 'text-brand-700' : 'text-ink-600'}`}>
                  {p2?.name ?? '—'}
                  {!p1Won && <span className="ml-2 text-xs text-brand-600 font-bold">G</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ms.map((s) => (
                  <div key={s.id} className="bg-ink-50 rounded-lg px-3 py-1.5 text-center min-w-[3rem]">
                    <div className="text-sm font-semibold text-ink-900">{s.pair1_games}</div>
                    <div className="text-sm font-semibold text-ink-900">{s.pair2_games}</div>
                  </div>
                ))}
                <div className="text-xs text-ink-400 ml-2">
                  {p1Sets}-{p2Sets}
                </div>
              </div>
            </div>
            {m.scheduled_date && (
              <div className="mt-2 text-xs text-ink-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(m.scheduled_date).toLocaleDateString('es', { dateStyle: 'medium' })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FixtureList({ matches, setsByMatchId, pairMap }: {
  matches: Match[];
  setsByMatchId: Map<string, MatchSet[]>;
  pairMap: Map<string, Pair>;
}) {
  if (matches.length === 0) {
    return <EmptyState icon={Calendar} title="Sin fixture" message="El fixture aún no ha sido generado para esta categoría." />;
  }

  const byRound = new Map<number, Match[]>();
  matches.forEach((m) => {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  });
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);

  return (
    <div className="divide-y divide-ink-100">
      {rounds.map((round) => {
        const roundMatches = byRound.get(round)!;
        const allPlayed = roundMatches.every((m) => m.status === 'played');
        return (
          <div key={round} className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-display font-semibold text-ink-800">
                {round >= 100 ? 'Cuadrangular' : `Fecha ${round}`}
              </h4>
              {allPlayed && <StatusBadge status="played" />}
            </div>
            <div className="space-y-2">
              {roundMatches.map((m) => {
                const p1 = pairMap.get(m.pair1_id);
                const p2 = pairMap.get(m.pair2_id);
                const ms = (setsByMatchId.get(m.id) ?? []).sort((a, b) => a.set_number - b.set_number);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-4 bg-ink-50 rounded-lg px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-800 truncate">{p1?.name ?? '—'}</div>
                      <div className="text-xs text-ink-400">vs</div>
                      <div className="text-sm font-medium text-ink-800 truncate">{p2?.name ?? '—'}</div>
                    </div>
                    {m.status === 'played' && ms.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        {ms.map((s) => (
                          <div key={s.id} className="bg-white rounded px-2 py-1 text-xs font-semibold text-ink-700 border border-ink-200">
                            {s.pair1_games}-{s.pair2_games}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-right">
                        <StatusBadge status={m.status} />
                        {m.scheduled_date && (
                          <div className="text-xs text-ink-400 mt-1 flex items-center gap-1 justify-end">
                            <MapPin className="w-3 h-3" />
                            {new Date(m.scheduled_date).toLocaleDateString('es', { dateStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
