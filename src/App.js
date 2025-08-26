import React, { useState, useEffect } from 'react';
import Admin from './Admin';
import Student from './Student';
import AdminRoster from './AdminRoster';
import { Card, Button, TextInput, Splash } from './components/ui';
import usePersistentState from './hooks/usePersistentState';
import useStudents from './hooks/useStudents';
import useTeachers from './hooks/useTeachers';
import { teacherEmailValid, genId } from './utils';
import { hashPassword, comparePassword } from './utils/password';

export default function App() {
  const getRoute = () => (typeof location !== 'undefined' && location.hash ? location.hash.slice(1) : '/');
  const [route, setRoute] = useState(getRoute());
  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const ADMIN_LS = 'nm_is_admin_v1';
  const [isAdmin, setIsAdmin] = useState(() => {
    try { return localStorage.getItem(ADMIN_LS) === '1'; } catch { return false; }
  });
  const allowAdmin = () => { try { localStorage.setItem(ADMIN_LS, '1'); } catch {} setIsAdmin(true); };
  const denyAdmin  = () => { try { localStorage.removeItem(ADMIN_LS); } catch {} setIsAdmin(false); };

  const [selectedStudentId, setSelectedStudentId] = usePersistentState('nm_points_current_student', '');

  const [menuOpen, setMenuOpen] = useState(false);

  const logoutAdmin = () => {
    denyAdmin();
    setMenuOpen(false);
    window.location.hash = '/';
  };

  // Add proper menu management
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.menu-wrapper')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Add route change handler to close menu
  useEffect(() => {
    setMenuOpen(false);
  }, [route]);

  return (
    <div className="min-h-screen">
      <Splash />
      <div className="relative z-10 max-w-6xl mx-auto">
        <header className="app-header">
          <h1 className="app-title">Neuromarketing Housepoints</h1>
          {route !== '/' && (
            <div className="menu-wrapper">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="menu-button"
                aria-label="Menu"
              >☰</button>
              {menuOpen && (
                <div className="dropdown">
                  <a href="#/student" className="dropdown-link" onClick={() => setMenuOpen(false)}>Student</a>
                  <a href="#/admin" className="dropdown-link" onClick={() => setMenuOpen(false)}>Beheer</a>
                  {isAdmin && (
                    <a href="#/admin/preview" className="dropdown-link" onClick={() => setMenuOpen(false)}>
                      Preview student
                    </a>
                  )}
                  {isAdmin && (
                    <button onClick={logoutAdmin} className="dropdown-button">Uitloggen beheer</button>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        {route === '/admin' ? (
          isAdmin ? <Admin /> : <AdminGate onAllow={allowAdmin} />
        ) : route === '/student' ? (
          <Student selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} />
        ) : route === '/roster' ? (
          isAdmin ? <AdminRoster /> : <AdminGate onAllow={allowAdmin} />
        ) : route === '/admin/preview' ? (
          isAdmin ? (
            <AdminPreview
              selectedStudentId={selectedStudentId}
              setSelectedStudentId={setSelectedStudentId}
            />
          ) : (
            <AdminGate onAllow={allowAdmin} />
          )
        ) : (
          <RoleSelect />
        )}
      </div>
    </div>
  );
}

function AdminGate({ onAllow }) {
  const [authMode, setAuthMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPassword2, setSignupPassword2] = useState('');
  const [signupError, setSignupError] = useState('');
  const [teachers, setTeachers] = useTeachers();

  const handleLogin = () => {
    const norm = loginEmail.trim().toLowerCase();
    if (!teacherEmailValid(norm)) {
      setLoginError('Alleen adressen eindigend op @nhlstenden.com zijn toegestaan.');
      return;
    }
    const t = teachers.find((te) => te.email.toLowerCase() === norm);
    if (t && comparePassword(loginPassword, t.passwordHash)) {
      setLoginError('');
      onAllow();
    } else {
      setLoginError('Onjuiste e-mail of wachtwoord.');
    }
  };

  const handleSignup = () => {
    const norm = signupEmail.trim().toLowerCase();
    if (!teacherEmailValid(norm)) return;
    if (!signupPassword.trim() || signupPassword !== signupPassword2) {
      setSignupError('Wachtwoorden komen niet overeen.');
      return;
    }
    if (teachers.some((t) => t.email.toLowerCase() === norm)) {
      setSignupError('E-mailadres bestaat al.');
      return;
    }
    const hash = hashPassword(signupPassword.trim());
    setTeachers((prev) => [...prev, { id: genId(), email: norm, passwordHash: hash }]);
    setSignupEmail('');
    setSignupPassword('');
    setSignupPassword2('');
    setSignupError('');
    onAllow();
  };

  return (
    <div className="max-w-md mx-auto">
      <Card title="Beheer – Toegang">
        {authMode === 'login' ? (
          <>
            <p className="text-sm text-neutral-600 mb-3">Alleen docenten. Log in met je @nhlstenden.com e-mailadres.</p>
            <TextInput
              value={loginEmail}
              onChange={setLoginEmail}
              placeholder="E-mail"
              className="mb-2"
            />
            <TextInput
              type="password"
              value={loginPassword}
              onChange={setLoginPassword}
              placeholder="Wachtwoord"
              className="mb-4"
            />
            {loginError && <div className="text-sm text-rose-600 mt-2">{loginError}</div>}
            <div className="mt-3 flex gap-2">
              <Button
                className="bg-indigo-600 text-white"
                onClick={handleLogin}
                disabled={!loginEmail.trim() || !loginPassword.trim()}
              >
                Inloggen
              </Button>
              <a href="#/student" className="px-4 py-2 rounded-2xl border">Terug naar studenten</a>
            </div>
            <button
              className="text-sm text-indigo-600 text-left mt-2"
              onClick={() => {
                setLoginEmail('');
                setLoginPassword('');
                setLoginError('');
                setAuthMode('signup');
              }}
            >
              Account aanmaken
            </button>
          </>
        ) : (
          <>
            <TextInput
              value={signupEmail}
              onChange={setSignupEmail}
              placeholder="E-mail (@nhlstenden.com)"
            />
            {signupEmail && !teacherEmailValid(signupEmail) && (
              <div className="text-sm text-rose-600">
                Alleen adressen eindigend op @nhlstenden.com zijn toegestaan.
              </div>
            )}
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
              className="mb-4"
            />
            {signupError && <div className="text-sm text-rose-600 mt-2">{signupError}</div>}
            <div className="mt-3 flex gap-2">
              <Button
                className="bg-indigo-600 text-white"
                onClick={handleSignup}
                disabled={
                  !signupEmail.trim() ||
                  !signupPassword.trim() ||
                  signupPassword !== signupPassword2 ||
                  !teacherEmailValid(signupEmail)
                }
              >
                Account aanmaken
              </Button>
              <a href="#/student" className="px-4 py-2 rounded-2xl border">Terug naar studenten</a>
            </div>
            <button
              className="text-sm text-indigo-600 text-left mt-2"
              onClick={() => {
                setSignupEmail('');
                setSignupPassword('');
                setSignupPassword2('');
                setSignupError('');
                setAuthMode('login');
              }}
            >
              Terug naar inloggen
            </button>
          </>
        )}
      </Card>
    </div>
  );
}

/* AdminPreview: dropdown met studenten uit useStudents */
function AdminPreview({ selectedStudentId, setSelectedStudentId }) {
  const studentsHook = useStudents();
  // Ondersteun zowel return van [students, setStudents] als direct students
  const studentsRaw =
    Array.isArray(studentsHook?.[0]) && typeof studentsHook?.[1] === 'function'
      ? studentsHook[0]
      : studentsHook;

  const students = Array.isArray(studentsRaw)
    ? studentsRaw
    : studentsRaw && typeof studentsRaw === 'object'
    ? Object.values(studentsRaw)
    : [];

  const toId = (s, i) => String(s?.id ?? s?.code ?? s?.studentId ?? (typeof s === 'string' ? s : i));
  const toName = (s, id) => {
    if (typeof s === 'string') return s;
    const name =
      s?.name ??
      s?.fullName ??
      [s?.firstName, s?.lastName].filter(Boolean).join(' ').trim();
    return String(name || id);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Preview student">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm text-neutral-600 mb-1">Selecteer student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="">— Geen selectie —</option>
              {students.map((s, i) => {
                const id = toId(s, i);
                const name = toName(s, id);
                const email = typeof s === 'string' ? '' : s?.email;
                return (
                  <option key={id} value={id}>
                    {name} ({email || id})
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-neutral-500 mt-2">
              Tip: Laat leeg om te zien wat een student zonder selectie ziet.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="border" onClick={() => setSelectedStudentId('')}>Leegmaken</Button>
            <a href="#/admin" className="px-4 py-2 rounded-2xl border">Terug naar beheer</a>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <Student
          selectedStudentId={selectedStudentId}
          setSelectedStudentId={setSelectedStudentId}
        />
      </div>
    </div>
  );
}

function RoleSelect() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useTeachers();
  const [students, setStudents] = useStudents();

  const handleLogin = () => {
    const norm = email.trim().toLowerCase();
    
    if (norm.endsWith('@student.nhlstenden.com')) {
      const student = students.find(s => s.email?.toLowerCase() === norm);
      if (student && comparePassword(password, student.passwordHash)) {
        window.location.hash = '/student';
      } else {
        setError('Onjuiste e-mail of wachtwoord.');
      }
    } else if (norm.endsWith('@nhlstenden.com')) {
      const teacher = teachers.find(t => t.email.toLowerCase() === norm);
      if (teacher && comparePassword(password, teacher.passwordHash)) {
        if (!teacher.approved) {
          setError('Account wacht nog op goedkeuring van een beheerder.');
          return;
        }
        try { 
          localStorage.setItem('nm_is_admin_v1', '1');
        } catch {}
        window.location.hash = '/admin';
      } else {
        setError('Onjuiste e-mail of wachtwoord.');
      }
    } else {
      setError('Gebruik een @student.nhlstenden.com of @nhlstenden.com adres.');
    }
  };

  const handleSignup = () => {
    const norm = email.trim().toLowerCase();
    
    if (!password.trim() || password !== password2) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }

    if (norm.endsWith('@student.nhlstenden.com')) {
      if (students.some(s => s.email?.toLowerCase() === norm)) {
        setError('E-mailadres bestaat al.');
        return;
      }
      const hash = hashPassword(password.trim());
      setStudents(prev => [...prev, { 
        id: genId(), 
        email: norm, 
        passwordHash: hash,
        name: norm.split('@')[0]
      }]);
      window.location.hash = '/student';
    } else if (norm.endsWith('@nhlstenden.com')) {
      if (teachers.some(t => t.email.toLowerCase() === norm)) {
        setError('E-mailadres bestaat al.');
        return;
      }
      const hash = hashPassword(password.trim());
      setTeachers(prev => [...prev, { 
        id: genId(), 
        email: norm, 
        passwordHash: hash,
        approved: false, // Add approved status
        createdAt: new Date().toISOString()
      }]);
      setError('Account aangemaakt. Wacht op goedkeuring van een beheerder.');
      setMode('login');
      // Remove auto-login for unapproved admin accounts
      return;
    } else {
      setError('Gebruik een @student.nhlstenden.com of @nhlstenden.com adres.');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card title={mode === 'login' ? 'Log in' : 'Account aanmaken'}>
        <TextInput
          value={email}
          onChange={setEmail}
          placeholder="E-mail"
          className="mb-2"
        />
        <TextInput
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Wachtwoord"
          className="mb-2"
        />
        {mode === 'signup' && (
          <TextInput
            type="password"
            value={password2}
            onChange={setPassword2}
            placeholder="Bevestig wachtwoord"
            className="mb-4"
          />
        )}
        {error && <div className="text-sm text-rose-600 mb-2">{error}</div>}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-indigo-600 text-white"
            onClick={mode === 'login' ? handleLogin : handleSignup}
            disabled={!email.trim() || !password.trim() || (mode === 'signup' && !password2.trim())}
          >
            {mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
          </Button>
          <Button
            className="w-full border"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
              setPassword('');
              setPassword2('');
            }}
          >
            {mode === 'login' ? 'Account aanmaken' : 'Terug naar inloggen'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
