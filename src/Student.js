import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Button, TextInput } from './components/ui';
import BadgeOverview from './components/BadgeOverview';
import useStudents from './hooks/useStudents';
import useGroups from './hooks/useGroups';
import useAwards from './hooks/useAwards';
import { genId, emailValid, getIndividualLeaderboard, getGroupLeaderboard, nameFromEmail } from './utils';
import { hashPassword, comparePassword } from './utils/password';
import useBadges from './hooks/useBadges';

export default function Student({ selectedStudentId, setSelectedStudentId }) {
  const [students, setStudents] = useStudents();
  const [groups] = useGroups();
  const [awards] = useAwards();
  const [badgeDefs] = useBadges();

  const groupById = useMemo(() => {
    const m = new Map();
    for (const g of groups) m.set(g.id, g);
    return m;
  }, [groups]);

  const individualLeaderboard = useMemo(() => getIndividualLeaderboard(students), [students]);

  const groupLeaderboard = useMemo(
    () => getGroupLeaderboard(groups, students),
    [groups, students]
  );

  const addStudent = useCallback((name, email, password = '') => {
    const id = genId();
    const passwordHash = password ? hashPassword(password) : '';
    setStudents((prev) => [
      ...prev,
      { id, name, email: email || undefined, passwordHash, groupId: null, points: 0, badges: [] }
    ]);
    return id;
  }, [setStudents]);

  useEffect(() => {
    if (selectedStudentId && !students.find((s) => s.id === selectedStudentId)) {
      setSelectedStudentId('');
    }
  }, [students, selectedStudentId, setSelectedStudentId]);

  const me = students.find((s) => s.id === selectedStudentId) || null;
  const myGroup = me && me.groupId ? groupById.get(me.groupId) || null : null;
  const myBadges = me?.badges || [];

  const myAwards = useMemo(() => {
    return awards.filter(
      (a) =>
        (a.type === 'student' && a.targetId === selectedStudentId) ||
        (a.type === 'group' && myGroup && a.targetId === myGroup.id)
    );
  }, [awards, selectedStudentId, myGroup]);

  const [showBadges, setShowBadges] = useState(false);

  const [authMode, setAuthMode] = useState('login');

  const handleLogout = () => {
    setSelectedStudentId('');
    window.location.hash = '/';
  };

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [resetStudent, setResetStudent] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  const handleLogin = () => {
    if (!emailValid(loginEmail)) return;
    const normEmail = loginEmail.trim().toLowerCase();
    const existing = students.find((s) => (s.email || '').toLowerCase() === normEmail);
    if (existing) {
      const pass = loginPassword.trim();
      if (existing.tempCode && pass === existing.tempCode) {
        setResetStudent(existing);
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');
      } else if (comparePassword(pass, existing.passwordHash)) {
        setSelectedStudentId(existing.id);
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');
      } else {
        setLoginError('Onjuist wachtwoord of code.');
      }
    } else {
      setLoginError('Onbekend e-mailadres.');
    }
  };

  const [signupEmail, setSignupEmail] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPassword2, setSignupPassword2] = useState('');
  const [signupError, setSignupError] = useState('');
  const handleSignup = () => {
    if (
      !signupEmail.trim() ||
      !signupName.trim() ||
      !emailValid(signupEmail) ||
      !signupPassword.trim()
    )
      return;

    if (signupPassword !== signupPassword2) {
      setSignupError('Wachtwoorden komen niet overeen.');
      return;
    }

    const normEmail = signupEmail.trim().toLowerCase();
    const existing = students.find((s) => (s.email || '').toLowerCase() === normEmail);
    if (existing) {
      setSignupError('E-mailadres bestaat al.');
    } else {
      const newId = addStudent(signupName.trim(), normEmail, signupPassword);
      setSelectedStudentId(newId);
      setSignupEmail('');
      setSignupName('');
      setSignupPassword('');
      setSignupPassword2('');
      setSignupError('');
    }
  };

  const handleSetNewPassword = () => {
    if (!resetStudent) return;
    if (!newPassword.trim() || newPassword !== newPassword2) return;
    const id = resetStudent.id;
    const pass = newPassword.trim();
    const hash = hashPassword(pass);
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, passwordHash: hash, tempCode: undefined } : s))
    );
    setResetStudent(null);
    setSelectedStudentId(id);
    setNewPassword('');
    setNewPassword2('');
  };

  if (resetStudent) {
    return (
      <div className="max-w-md mx-auto">
        <Card title="Nieuw wachtwoord instellen">
          <div className="grid grid-cols-1 gap-4">
            <TextInput
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Nieuw wachtwoord"
            />
            <TextInput
              type="password"
              value={newPassword2}
              onChange={setNewPassword2}
              placeholder="Bevestig wachtwoord"
            />
            <Button
              className="bg-indigo-600 text-white"
              disabled={!newPassword.trim() || newPassword !== newPassword2}
              onClick={handleSetNewPassword}
            >
              Opslaan
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!selectedStudentId) {
    return (
      <div className="max-w-md mx-auto">
        {authMode === 'login' ? (
          <Card title="Log in">
            <div className="grid grid-cols-1 gap-4">
              <TextInput
                value={loginEmail}
                onChange={setLoginEmail}
                placeholder="E-mail (@student.nhlstenden.com)"
              />
              <TextInput
                type="password"
                value={loginPassword}
                onChange={setLoginPassword}
                placeholder="Wachtwoord of code"
              />
              {loginEmail && !emailValid(loginEmail) && (
                <div className="text-sm text-rose-600">
                  Alleen adressen eindigend op @student.nhlstenden.com zijn toegestaan.
                </div>
              )}
              {loginError && <div className="text-sm text-rose-600">{loginError}</div>}
              <Button
                className="bg-indigo-600 text-white"
                disabled={!loginEmail.trim() || !emailValid(loginEmail) || !loginPassword.trim()}
                onClick={handleLogin}
              >
                Log in
              </Button>
              <button
                className="text-sm text-indigo-600 text-left"
                onClick={() => {
                  setSignupEmail('');
                  setSignupName('');
                  setSignupPassword('');
                  setSignupPassword2('');
                  setSignupError('');
                  setAuthMode('signup');
                }}
              >
                Account aanmaken
              </button>
            </div>
          </Card>
        ) : (
          <Card title="Account aanmaken">
            <div className="grid grid-cols-1 gap-4">
              <TextInput
                value={signupEmail}
                onChange={(v) => {
                  setSignupEmail(v);
                  setSignupName(nameFromEmail(v));
                }}
                placeholder="E-mail (@student.nhlstenden.com)"
              />
              {signupEmail && !emailValid(signupEmail) && (
                <div className="text-sm text-rose-600">
                  Alleen adressen eindigend op @student.nhlstenden.com zijn toegestaan.
                </div>
              )}
              <TextInput value={signupName} onChange={setSignupName} placeholder="Volledige naam" />
              <TextInput
                type="password"
                value={signupPassword}
                onChange={setSignupPassword}
                placeholder="Wachtwoord"
              />
              <TextInput
                type="password"
                value={signupPassword2}
                onChange={setSignupPassword2}
                placeholder="Bevestig wachtwoord"
              />
              {signupError && <div className="text-sm text-rose-600">{signupError}</div>}
              <Button
                className="bg-indigo-600 text-white"
                disabled={
                  !signupEmail.trim() ||
                  !signupName.trim() ||
                  !emailValid(signupEmail) ||
                  !signupPassword.trim() ||
                  signupPassword !== signupPassword2
                }
                onClick={handleSignup}
              >
                Account aanmaken
              </Button>
              <button
                className="text-sm text-indigo-600 text-left"
                onClick={() => {
                  setLoginEmail('');
                  setLoginPassword('');
                  setLoginError('');
                  setSignupPassword('');
                  setSignupPassword2('');
                  setSignupError('');
                  setAuthMode('login');
                }}
              >
                Terug naar inloggen
              </button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (showBadges) {
    return (
      <div className="relative">
        <div className="fixed inset-0 z-0">
          <img
            src={process.env.PUBLIC_URL + '/images/voorpagina.png'}
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          {me && (
            <div className="flex items-center justify-between mb-4">
              <span className="bg-white/90 px-2 py-1 rounded">
                Ingelogd als {me.name}{me.email ? ` (${me.email})` : ''}
              </span>
              <Button className="bg-indigo-600 text-white" onClick={handleLogout}>
                Uitloggen
              </Button>
            </div>
          )}
          <Card title="Verdiende badges">
            {me ? (
              <>
                <div className="sticky top-0 bg-white pb-4 z-10">
                  <Button className="bg-indigo-600 text-white" onClick={() => setShowBadges(false)}>
                    Terug naar puntenoverzicht
                  </Button>
                </div>
                <BadgeOverview badgeDefs={badgeDefs} earnedBadges={myBadges} />
              </>
            ) : (
              <p className="text-sm text-neutral-600">Selecteer een student om badges te bekijken.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const myIndividual = individualLeaderboard.find((s) => s.id === selectedStudentId);
  const myGroupStats = myGroup ? groupLeaderboard.find((g) => g.id === myGroup.id) : null;

  return (
    <div className="relative">
      <div className="fixed inset-0 z-0">
        <img
          src={process.env.PUBLIC_URL + '/images/voorpagina.png'}
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto">
        {me && (
          <div className="flex items-center justify-between mb-4">
            <span className="bg-white/90 px-2 py-1 rounded">
              Ingelogd als {me.name}{me.email ? ` (${me.email})` : ''}
            </span>
            <Button className="bg-indigo-600 text-white" onClick={handleLogout}>
              Uitloggen
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card title="Puntenoverzicht" className="lg:col-span-3">
            {me ? (
              <div className="space-y-2">
                <div>
                  Je hebt{' '}
                  <span
                    className={`font-semibold ${
                      me.points >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {me.points}
                  </span>{' '}
                  punten.
                </div>
                {myIndividual && (
                  <div>Individuele rang: #{myIndividual.rank} van {individualLeaderboard.length}</div>
                )}
                {myGroup && myGroupStats && (
                  <div>
                    Groepsrang ({myGroup.name}): #{myGroupStats.rank} van {groupLeaderboard.length}
                  </div>
                )}
                <Button
                  className="bg-indigo-600 text-white mt-4"
                  onClick={() => setShowBadges(true)}
                >
                  Bekijk badges
                </Button>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">Selecteer een student om punten te bekijken.</p>
            )}
          </Card>

          <Card title="Jouw recente activiteiten" className="lg:col-span-2 max-h-[320px] overflow-auto">
            <ul className="space-y-2 text-sm">
              {myAwards.length === 0 && <li>Geen recente items.</li>}
              {myAwards.map((a) => {
                const badge = a.badgeId ? badgeDefs.find((b) => b.id === a.badgeId) : null;
                return (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>
                      {new Date(a.ts).toLocaleString()} ·
                      {badge
                        ? ` Badge — ${badge?.title || ''}`
                        : `${a.type === 'student' ? 'Individueel' : `Groep (${myGroup?.name || '-'})`}${a.reason ? ` — ${a.reason}` : ''}`}
                    </span>
                    {!badge && (
                      <span
                        className={`font-semibold ${
                          a.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {a.amount >= 0 ? '+' : ''}
                        {a.amount}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
