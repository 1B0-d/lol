import { useEffect, useMemo, useState, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { Download, LogOut, Mail, Send } from "lucide-react";
import { ensureOk, fetchWithRetry, getFriendlyErrorMessage, getPendingRequestMessage } from "./api.js";
import { apiUrl, backendAssetUrl } from "./config.js";
import { auth, authReady, googleProvider } from "./firebase.js";
import { content } from "./content.js";

const logoutRedirectKey = "logout_redirect_pending";

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = (nextPath, replace = false) => {
    if (replace) {
      window.history.replaceState({}, "", nextPath);
    } else {
      window.history.pushState({}, "", nextPath);
    }
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return { path, navigate };
}

function langFromPath(path) {
  return path.endsWith("/ru") || path.startsWith("/ru") ? "ru" : "en";
}

async function resolveAuthenticatedUser() {
  await authReady;

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const timeoutAt = Date.now() + 3000;
  while (Date.now() < timeoutAt) {
    if (auth.currentUser) {
      return auth.currentUser;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return null;
}

function Link({ href, children, className, download, onNavigate }) {
  const handleClick = (event) => {
    if (!onNavigate || href.startsWith("http") || href.startsWith("mailto:") || download || href.endsWith(".pdf")) {
      return;
    }

    if (href.includes("#")) {
      return;
    }

    event.preventDefault();
    onNavigate(href);
  };

  return (
    <a href={href} className={className} download={download} onClick={handleClick}>
      {children}
    </a>
  );
}

function SiteNav({ lang, onNavigate, compact = false }) {
  const t = content[lang];
  const isRu = lang === "ru";
  const home = isRu ? "/ru" : "/";
  const cv = backendAssetUrl(isRu ? "/CV_Ildar_ru.pdf" : "/CV_Ildar_en.pdf");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={compact ? "nav-links nav-links-page" : "nav-links"}>
      <Link href={`${home}#about`} onNavigate={onNavigate}>{t.nav.about}</Link>
      <Link href={`${home}#experience`} onNavigate={onNavigate}>{t.nav.experience}</Link>
      <Link href={`${home}#contact`} onNavigate={onNavigate}>{t.nav.contact}</Link>
      {!compact && <Link href={isRu ? "/auth/ru" : "/auth"} onNavigate={onNavigate}>{t.nav.login}</Link>}
      {!compact && <Link href={isRu ? "/dashboard/ru" : "/dashboard"} onNavigate={onNavigate}>{t.nav.dashboard}</Link>}
      <details ref={dropdownRef} open={open} className="nav-dropdown">
        <summary onClick={(e) => {e.preventDefault(); setOpen(prev => !prev)}}>{t.nav.language}</summary>
        {open && 
        <div onClick={() =>  setOpen(prev => !prev)} className="nav-dropdown-menu">
          <Link  className="btn btn-secondary" href={isRu ? "/" : "/ru"} onNavigate={onNavigate}>
            {t.nav.otherLanguage}
          </Link>
        </div>}
      </details>
      <a href={cv} className="btn btn-secondary" download>
        <Download size={17} /> {t.nav.downloadCv}
      </a>
    </div>
  );
}

function HomePage({ lang, onNavigate, dropdownRef }) {
  const t = content[lang];
  const isRu = lang === "ru";
  const cv = backendAssetUrl(isRu ? "/CV_Ildar_ru.pdf" : "/CV_Ildar_en.pdf");

  useEffect(() => {
    document.title = t.home.title;
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("show");
        });
      },
      { threshold: 0.12 }
    );

    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [t.home.title]);

  return (
    <div ref={dropdownRef}>
      <nav className="nav">
        <div className="container nav-wrap">
          <Link href={isRu ? "/ru" : "/"} className="logo" onNavigate={onNavigate}>Ildar<span>.</span></Link>
          <SiteNav lang={lang} onNavigate={onNavigate}  />
        </div>
      </nav>

      <header className="hero" id="home">
        <div className="container hero-grid">
          <div className="hero-card reveal">
            <div className="eyebrow">{t.home.eyebrow}</div>
            <h1>
              <span className="gradient-text">{t.home.headlineTop}</span><br />
              {t.home.headlineBottom}
            </h1>
            <p className="lead">{t.home.lead}</p>
            <div className="hero-actions">
              <Link href={isRu ? "/auth/ru" : "/auth"} className="btn btn-secondary" onNavigate={onNavigate}>
                {t.home.cta}
              </Link>
            </div>
            <div className="stats">
              {t.home.stats.map(([value, label]) => (
                <div className="stat" key={label}>
                  <h3>{value}</h3>
                  <p>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="glass profile-card reveal">
            <div className="avatar">IS</div>
            <h2>Ildar Savzikhanov</h2>
            <p className="subtitle">{t.home.subtitle}</p>
            <ul className="mini-list">
              {t.home.facts.map((fact) => <li key={fact}><span className="dot" />{fact}</li>)}
            </ul>
            <div className="project-links">
              <a href="https://github.com/1B0-d">GitHub</a>
              <a href="mailto:Eldar12062006@gmail.com">Email</a>
              <a href="https://t.me/I_B_01">Telegram</a>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section id="about">
          <div className="container">
            <div className="section-head reveal"><h2>{t.home.aboutTitle}</h2></div>
            <div className="about-grid">
              <div className="card reveal">{t.home.about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
              <div className="card reveal">
                <h3>{t.home.skillsTitle}</h3>
                <div className="skill-groups">
                  {t.home.skillGroups.map(([title, skills]) => (
                    <div className="skill-box" key={title}>
                      <h3>{title}</h3>
                      <div className="tags">{skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="experience">
          <div className="container">
            <div className="section-head reveal"><h2>{t.home.experienceTitle}</h2></div>
            <div className="timeline">
              {t.home.jobs.map((job) => (
                <div className="timeline-item reveal" key={job.title}>
                  <div className="timeline-time">{job.time}</div>
                  <div>
                    <h3>{job.title}</h3>
                    <ul>{job.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact">
          <div className="container">
            <div className="section-head reveal"><h2>{t.home.contactTitle}</h2></div>
            <div className="card contact-card reveal">
              <h3 className="contact-title">{t.home.contactHeading}</h3>
              <p className="contact-text">{t.home.contactText}</p>
              <div className="contact-list">
                <a className="contact-item" href="mailto:Eldar12062006@gmail.com"><strong>Email:</strong> Eldar12062006@gmail.com</a>
                <a className="contact-item" href="https://github.com/1B0-d" target="_blank" rel="noreferrer"><strong>GitHub:</strong> github.com/1B0-d</a>
                <a className="contact-item" href="https://t.me/I_B_01"><strong>Telegram:</strong> @I_B_01</a>
              </div>
              <div className="contact-right">
                <div className="cta-box">
                  <h3>{t.home.cvTitle}</h3>
                  <p>{t.home.cvText}</p>
                  <a href={cv} className="btn btn-primary"><Download size={18} /> {t.home.openCv}</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer><div className="container">© {new Date().getFullYear()} Ildar Savzikhanov. {t.home.footer}</div></footer>
    </div>
  );
}

function AuthPage({ lang, onNavigate }) {
  const t = content[lang];
  const [message, setMessage] = useState("");
  const [register, setRegister] = useState({ name: "", email: "", password: "" });
  const [login, setLogin] = useState({ email: "", password: "" });
  const isRu = lang === "ru";

  useEffect(() => {
    document.title = t.auth.title;
    let skipNextAutoRedirect = sessionStorage.getItem(logoutRedirectKey) === "1";
    if (skipNextAutoRedirect) sessionStorage.removeItem(logoutRedirectKey);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await authReady;
      if (skipNextAutoRedirect) {
        skipNextAutoRedirect = false;
        if (user) await signOut(auth).catch(console.warn);
        return;
      }

      if (!user) return;

      try {
        setMessage(getPendingRequestMessage(lang));
        const token = await user.getIdToken();
        const meRes = await fetchWithRetry(apiUrl("/api/me"), {
          headers: { Authorization: `Bearer ${token}` }
        }, { retries: 2, retryDelayMs: 3000, timeoutMs: 8000 });
        await ensureOk(meRes);
        const me = await meRes.json();
        onNavigate(me.role === "admin" ? "/admin" : (isRu ? "/dashboard/ru" : "/dashboard"), true);
      } catch (error) {
        setMessage(getFriendlyErrorMessage(error, lang));
      }
    });

    return unsubscribe;
  }, [isRu, lang, onNavigate, t.auth.title]);

  const redirectAfterAuth = async (user, name = "") => {
    setMessage(getPendingRequestMessage(lang));
    await authReady;
    const token = await user.getIdToken();
    const bootstrapResponse = await fetchWithRetry(apiUrl("/api/bootstrap-user"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name })
    }, { retries: 2, retryDelayMs: 3000 });
    await ensureOk(bootstrapResponse);

    const meRes = await fetchWithRetry(apiUrl("/api/me"), {
      headers: { Authorization: `Bearer ${token}` }
    }, { retries: 2, retryDelayMs: 3000 });
    await ensureOk(meRes);
    const me = await meRes.json();
    onNavigate(me.role === "admin" ? "/admin" : (isRu ? "/dashboard/ru" : "/dashboard"), true);
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    try {
      const cred = await createUserWithEmailAndPassword(auth, register.email.trim(), register.password);
      await redirectAfterAuth(cred.user, register.name.trim());
    } catch (error) {
      setMessage(getFriendlyErrorMessage(error, lang));
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    try {
      const cred = await signInWithEmailAndPassword(auth, login.email.trim(), login.password);
      await redirectAfterAuth(cred.user);
    } catch (error) {
      setMessage(getFriendlyErrorMessage(error, lang));
    }
  };

  const submitGoogle = async () => {
    try {
      await authReady;
      const cred = await signInWithPopup(auth, googleProvider);
      await redirectAfterAuth(cred.user, cred.user.displayName || "");
    } catch (error) {
      setMessage(getFriendlyErrorMessage(error, lang));
    }
  };

  return (
    <main className="page auth-page">
      <SiteNav lang={lang} compact onNavigate={onNavigate} />
      <div className="auth-grid">
        <section className="card">
          <h2>{t.auth.register}</h2>
          <form onSubmit={submitRegister}>
            <input value={register.name} onChange={(e) => setRegister({ ...register, name: e.target.value })} type="text" placeholder={t.auth.name} required />
            <input value={register.email} onChange={(e) => setRegister({ ...register, email: e.target.value })} type="email" placeholder={t.auth.email} required />
            <input value={register.password} onChange={(e) => setRegister({ ...register, password: e.target.value })} type="password" placeholder={t.auth.password} required />
            <button type="submit">{t.auth.register}</button>
          </form>
        </section>
        <section className="card">
          <h2>{t.auth.login}</h2>
          <form onSubmit={submitLogin}>
            <input value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} type="email" placeholder={t.auth.email} required />
            <input value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} type="password" placeholder={t.auth.password} required />
            <button type="submit">{t.auth.login}</button>
          </form>
          <button className="secondary-btn" type="button" onClick={submitGoogle}>{t.auth.google}</button>
        </section>
      </div>
      {message && <p className="status-text">{message}</p>}
    </main>
  );
}

function DashboardPage({ lang, onNavigate }) {
  const t = content[lang].dashboard;
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ subject: "", text: "" });
  const authPath = lang === "ru" ? "/auth/ru" : "/auth";

  const loadMessages = async (user) => {
    const token = await user.getIdToken();
    const res = await fetchWithRetry(apiUrl("/api/messages"), {
      headers: { Authorization: `Bearer ${token}` }
    }, { retries: 2, retryDelayMs: 3000, timeoutMs: 8000 });
    if (res.status === 401) {
      onNavigate(authPath, true);
      return;
    }
    await ensureOk(res);
    setMessages(await res.json());
    setStatus("");
  };

  useEffect(() => {
    document.title = t.title;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await authReady;
      const resolvedUser = user || await resolveAuthenticatedUser();
      if (!resolvedUser) {
        onNavigate(authPath, true);
        return;
      }

      setCurrentUser(resolvedUser);
      setStatus(getPendingRequestMessage(lang));

      try {
        const token = await resolvedUser.getIdToken(true);
        const meRes = await fetchWithRetry(apiUrl("/api/me"), {
          headers: { Authorization: `Bearer ${token}` }
        }, { retries: 2, retryDelayMs: 3000, timeoutMs: 8000 });
        if (meRes.status === 401) {
          onNavigate(authPath, true);
          return;
        }
        await ensureOk(meRes);

        const me = await meRes.json();
        if (me.role === "admin") {
          onNavigate("/admin", true);
          return;
        }

        await loadMessages(resolvedUser);
      } catch (error) {
        setStatus(getFriendlyErrorMessage(error, lang));
      }
    });

    return unsubscribe;
  }, [authPath, lang, onNavigate, t.title]);

  const submitMessage = async (event) => {
    event.preventDefault();
    try {
      setStatus(getPendingRequestMessage(lang));
      const token = await currentUser.getIdToken();
      const response = await fetchWithRetry(apiUrl("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: form.subject.trim(), text: form.text.trim() })
      }, { retries: 2, retryDelayMs: 3000, timeoutMs: 8000 });
      await ensureOk(response);
      setForm({ subject: "", text: "" });
      await loadMessages(currentUser);
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, lang));
    }
  };

  const logout = async () => {
    sessionStorage.setItem(logoutRedirectKey, "1");
    await signOut(auth);
    onNavigate(authPath, true);
  };

  return (
    <main className="page">
      <SiteNav lang={lang} compact onNavigate={onNavigate} />
      <div className="topbar">
        <h1>{t.title}</h1>
        <button className="small-button" type="button" onClick={logout}><LogOut size={17} /> {t.logout}</button>
      </div>
      <section className="card">
        <h2>{t.sendMessage}</h2>
        <form onSubmit={submitMessage}>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} type="text" placeholder={t.subject} required />
          <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder={t.message} required />
          <button type="submit" disabled={!currentUser}><Send size={17} /> {t.send}</button>
        </form>
        {status && <p className="status-text">{status}</p>}
      </section>
      <section className="card">
        <h2>{t.myMessages}</h2>
        {!messages.length && <p>{t.empty}</p>}
        {messages.map((message) => (
          <div className="message-card" key={message.id || `${message.subject}-${message.createdAt}`}>
            <h3>{message.subject}</h3>
            <p><strong>{t.status}:</strong> {message.status}</p>
            <p>{message.text}</p>
            {message.reply && <div className="reply-box"><strong>{t.reply}:</strong><p>{message.reply}</p></div>}
            <small>{new Date(message.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </section>
    </main>
  );
}

function AdminPage({ onNavigate }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [replies, setReplies] = useState({});

  const loadAdminMessages = async (user) => {
    const token = await user.getIdToken(true);
    const res = await fetchWithRetry(apiUrl("/api/admin/messages"), {
      headers: { Authorization: `Bearer ${token}` }
    }, { retries: 1, retryDelayMs: 2000 });

    if (res.status === 401 || res.status === 403) {
      onNavigate("/auth", true);
      return;
    }

    await ensureOk(res);
    const data = await res.json();
    setMessages(data);
    setReplies(Object.fromEntries(data.map((message) => [message.id, message.reply || ""])));
    setStatus("");
  };

  useEffect(() => {
    document.title = "Admin Dashboard";
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await authReady;
      const resolvedUser = user || await resolveAuthenticatedUser();
      if (!resolvedUser) {
        onNavigate("/auth", true);
        return;
      }

      setCurrentUser(resolvedUser);
      try {
        setStatus(getPendingRequestMessage("en"));
        const token = await resolvedUser.getIdToken(true);
        const meRes = await fetchWithRetry(apiUrl("/api/me"), {
          headers: { Authorization: `Bearer ${token}` }
        }, { retries: 2, retryDelayMs: 3000, timeoutMs: 8000 });

        if (meRes.status === 401) {
          onNavigate("/auth", true);
          return;
        }

        await ensureOk(meRes);
        const me = await meRes.json();
        if (me.role !== "admin") {
          onNavigate("/dashboard", true);
          return;
        }

        await loadAdminMessages(resolvedUser);
      } catch (error) {
        setStatus(getFriendlyErrorMessage(error, "en"));
      }
    });

    return unsubscribe;
  }, [onNavigate]);

  const saveReply = async (id) => {
    const reply = (replies[id] || "").trim();
    if (!reply) {
      setStatus("Reply cannot be empty.");
      return;
    }

    try {
      setStatus(getPendingRequestMessage("en"));
      const token = await currentUser.getIdToken(true);
      const response = await fetchWithRetry(apiUrl("/api/admin/reply"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, reply })
      }, { retries: 2, retryDelayMs: 3000, timeoutMs: 8000 });

      if (response.status === 401 || response.status === 403) {
        onNavigate("/auth", true);
        return;
      }

      await ensureOk(response);
      setStatus("Reply saved.");
      await loadAdminMessages(currentUser);
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "en"));
    }
  };

  const logout = async () => {
    sessionStorage.setItem(logoutRedirectKey, "1");
    await signOut(auth);
    onNavigate("/auth", true);
  };

  return (
    <main className="page">
      <div className="topbar">
        <h1>Admin Dashboard</h1>
        <button className="small-button" type="button" onClick={logout}><LogOut size={17} /> Logout</button>
      </div>
      <section className="card">
        <h2>All Messages</h2>
        {status && <p className="status-text">{status}</p>}
        {messages.map((message) => (
          <div className="message-card" key={message.id}>
            <h3>{message.subject}</h3>
            <p><strong>From:</strong> {message.userEmail}</p>
            <p><strong>Status:</strong> {message.status}</p>
            <p>{message.text}</p>
            <textarea value={replies[message.id] || ""} onChange={(e) => setReplies({ ...replies, [message.id]: e.target.value })} placeholder="Write reply..." />
            <button type="button" onClick={() => saveReply(message.id)}><Mail size={17} /> Save Reply</button>
            <small>{new Date(message.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </section>
    </main>
  );
}

export function App() {
  const { path, navigate } = useRoute();
  const route = useMemo(() => {
    if (path === "/auth" || path === "/auth/ru") return "auth";
    if (path === "/dashboard" || path === "/dashboard/ru") return "dashboard";
    if (path === "/admin") return "admin";
    return "home";
  }, [path]);
  const lang = langFromPath(path);

  if (route === "auth") return <AuthPage lang={lang} onNavigate={navigate} />;
  if (route === "dashboard") return <DashboardPage lang={lang} onNavigate={navigate} />;
  if (route === "admin") return <AdminPage onNavigate={navigate} />;
  return <HomePage lang={lang} onNavigate={navigate} />;
}
