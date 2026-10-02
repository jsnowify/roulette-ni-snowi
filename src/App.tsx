import ActionIcon from './components/ActionIcon';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import CategoryNote from "./components/CategoryNote";
import ChallengePlan from "./components/ChallengePlan";
import ChallengeIntro, { ChallengeScope } from "./components/ChallengeIntro";
import CustomEntries from "./components/CustomEntries";
import Header from "./components/Header";
import Reel from "./components/Reel";
import SavedBriefs from "./components/SavedBriefs";
import { BUILTIN_ITEMS, REEL_DEFS, mergeItems } from "./data/reels";
import { useCustomEntries } from "./hooks/useCustomEntries";
import { useChallenge } from "./hooks/useChallenge";
import { usePersistentState } from "./hooks/usePersistentState";
import { useSavedBriefs } from "./hooks/useSavedBriefs";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { fromSearch, sameBrief, toSearch } from "./lib/brief";
import { CHALLENGE_KEY, challengeSentence, createChallenge, isChallenge } from "./lib/challenge";
import { readJSON } from "./lib/storage";
import { copyText } from "./lib/clipboard";
import { MAX_SAVED } from "./lib/saved";
import { drawFromBag, makePlan, seededPick, todayKey } from "./lib/random";
import { sfx } from "./lib/sound";
import { isComplete, type Brief, type Key, type Plan } from "./types";
// Walang laman ang reels pagbukas ng site. Lalabas lang ang brief pagkatapos ng unang spin.
const EMPTY: Brief = {
    brand: null,
    category: null,
    mood: null,
};
const HISTORY_MAX = 8; // current assignment plus seven previous assignments
const EXTRAS_KEY = "roulette-ni-snowi:extras";
const SOUND_KEY = "roulette-ni-snowi:sound";
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
const UiStyleGuide = lazy(() => import("./components/UiStyleGuide"));
export default function App() {
    useSmoothScroll();
    const { custom, add: addCustom, remove: removeCustom } = useCustomEntries();
    const items = useMemo(() => mergeItems(custom), [custom]);
    const { challenge, updateChallenge } = useChallenge();
    // Kung galing sa share link (?brand=...&category=...), iyon ang unang laman.
    const [fromLink] = useState(() => fromSearch(window.location.search, items));
    const [initialDrawAt] = useState(challenge?.drawnAt);
    const [pick, setPick] = useState<Brief>(challenge ? EMPTY : fromLink ?? EMPTY);
    const [designRevision, setDesignRevision] = useState(0);
    const [history, setHistory] = useState<Brief[]>(() => fromLink ? [fromLink] : []);
    const [extras, setExtras] = usePersistentState(EXTRAS_KEY, false, isBoolean);
    const [soundOn, setSoundOn] = usePersistentState(SOUND_KEY, false, isBoolean);
    const [plans, setPlans] = useState<Partial<Record<Key, Plan>>>({});
    const [spinId, setSpinId] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [copied, setCopied] = useState<"brief" | "link" | null>(null);
    const [copyFailed, setCopyFailed] = useState(false);
    const copyTimer = useRef(0);
    const spinActive = useRef(false);
    const savedApi = useSavedBriefs();
    // Mutable na hawak na hindi nagti-trigger ng render.
    const pending = useRef(0); // ilang reel pa ang umiikot
    const targetRef = useRef<Brief>(EMPTY); // ang magiging laman pagkatapos ng spin
    const bags = useRef<Record<Key, Set<string>>>({
        brand: new Set(),
        category: new Set(),
        mood: new Set(),
    });
    const displayedPick = spinning ? EMPTY : challenge?.brief ?? pick;
    const showMood = challenge ? challenge.brief.mood !== null : isComplete(pick) ? pick.mood !== null : extras;
    const reels = REEL_DEFS.filter((r) => showMood || !r.extra);
    // A drawn mood stays part of the assignment, independently of future settings.
    const shown: Brief = showMood ? displayedPick : { ...displayedPick, mood: null };
    const current = isComplete(shown) ? shown : null;
    const sentence = current ? challengeSentence(current) : "";
    const search = current ? toSearch(current) : "";
    const isSaved = current ? savedApi.has(current) : false;
    function spin(forced?: Partial<Record<Key, string>>) {
        if (spinActive.current || challenge || current)
            return;
        const stored = readJSON<unknown>(CHALLENGE_KEY, null);
        if (stored && isChallenge(stored)) {
            updateChallenge(stored);
            return;
        }
        const id = spinId + 1;
        const nextPick: Brief = { ...pick };
        const fresh: Partial<Record<Key, Plan>> = {};
        for (const r of reels) {
            const list = items[r.key];
            const value = forced?.[r.key] ?? drawFromBag(list, bags.current[r.key], pick[r.key]);
            nextPick[r.key] = value;
            fresh[r.key] = makePlan(list, value, id);
        }
        targetRef.current = nextPick;
        pending.current = Object.keys(fresh).length;
        if (pending.current === 0)
            return;
        spinActive.current = true;
        if (isComplete(nextPick))
            updateChallenge(createChallenge(showMood ? nextPick : { ...nextPick, mood: null }));
        setPlans((p) => ({ ...p, ...fresh }));
        setSpinId(id);
        setCopied(null);
        setCopyFailed(false);
        setSpinning(true);
        if (soundOn) {
            sfx.setEnabled(true);
            sfx.unlock();
            sfx.spin();
        }
    }
    function handleStop() {
        if (!spinActive.current || pending.current <= 0)
            return;
        if (soundOn)
            sfx.stop();
        pending.current -= 1;
        if (pending.current > 0)
            return;
        const final = targetRef.current;
        setPick(EMPTY);
        setDesignRevision(previous => previous + 1);
        setHistory((h) => [final, ...h].slice(0, HISTORY_MAX));
        setSpinning(false);
        spinActive.current = false;
        if (soundOn)
            sfx.done();
        window.requestAnimationFrame(() => document.getElementById('assigned-brand')?.focus());
    }
    // Parehong brief para sa lahat ng tao sa araw na ito (seeded sa petsa). Hindi kasama ang sarili mong entries.
    function dailyBrief() {
        const day = todayKey();
        const forced: Partial<Record<Key, string>> = {};
        for (const r of reels) {
            forced[r.key] = seededPick(BUILTIN_ITEMS[r.key], `${day}:${r.key}`);
        }
        spin(forced);
    }
    function accept() {
        if (!current || spinning || challenge?.acceptedAt)
            return;
        updateChallenge({ ...(challenge ?? createChallenge(current)), acceptedAt: Date.now() });
        setPick(EMPTY);
        savedApi.add(current);
        window.requestAnimationFrame(() => document.getElementById('plan-title')?.focus());
    }
    function toggleMilestone(index: number) {
        if (!challenge?.acceptedAt || challenge.finishedAt)
            return;
        updateChallenge({ ...challenge, completed: challenge.completed.map((done, i) => i === index ? !done : done) });
    }
    function finish() {
        if (!challenge?.acceptedAt || !challenge.completed.every(Boolean) || challenge.finishedAt)
            return;
        updateChallenge({ ...challenge, finishedAt: Date.now() });
        const saved = savedApi.saved.find(item => sameBrief(item, challenge.brief));
        if (saved && !saved.done)
            savedApi.toggleDone(saved.id);
    }
    function nextChallenge() {
        if (!challenge?.finishedAt)
            return;
        updateChallenge(null);
        setPick(EMPTY);
        setPlans({});
        setDesignRevision(previous => previous + 1);
        setCopied(null);
        setCopyFailed(false);
        window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.spin')?.focus());
    }
    async function copy(kind: "brief" | "link") {
        if (!current)
            return;
        const text = kind === "brief"
            ? sentence
            : `${window.location.origin}${window.location.pathname}?${search}`;
        window.clearTimeout(copyTimer.current);
        setCopyFailed(false);
        if (await copyText(text)) {
            setCopied(kind);
            copyTimer.current = window.setTimeout(() => setCopied(null), 1500);
        }
        else {
            setCopied(null);
            setCopyFailed(true);
        }
    }
    function toggleSound() {
        sfx.setEnabled(!soundOn);
        if (!soundOn) {
            sfx.unlock();
            sfx.tick();
        }
        setSoundOn((v) => !v);
    }
    function save() {
        if (current)
            savedApi.add(current);
    }
    // Nagbukas gamit ang link na may mood: i-on ang Extra reels para makita.
    useEffect(() => {
        if (fromLink && fromLink.mood)
            setExtras(true);
    }, [fromLink, setExtras]);
    // Laging naka-sync ang URL sa kasalukuyang brief, kaya pwedeng i-copy ang address bar.
    useEffect(() => {
        if (!search && spinning)
            return;
        const remaining = new URLSearchParams(window.location.search);
        if (!search)
            for (const key of ['brand', 'category', 'mood'])
                remaining.delete(key);
        const query = search || remaining.toString();
        try {
            window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
        }
        catch {
            /* hal. sandboxed iframe: okay lang, may "Copy link" pa rin */
        }
    }, [search, spinning]);
    useEffect(() => {
        const onVisibility = () => { if (document.hidden)
            sfx.silence(); };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.clearTimeout(copyTimer.current);
            sfx.setEnabled(false);
        };
    }, []);
    // Isang listener lang, pero laging ang pinakabagong spin() ang tinatawag.
    const spinRef = useRef(spin);
    useEffect(() => {
        spinRef.current = spin;
    });
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === "Space" && !e.repeat && e.target === document.body) {
                e.preventDefault();
                spinRef.current();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
    return (<main className="page">
      <Header spinning={spinning} stage={challenge?.finishedAt ? 'finished' : challenge?.acceptedAt ? 'building' : current ? 'assigned' : 'ready'}/>

      <ChallengeIntro stage={challenge?.finishedAt ? 'finish' : challenge?.acceptedAt ? 'build' : current ? 'accept' : 'spin'}/>

      <section className="workbench" aria-labelledby="draw-title">
        <div className="section-heading">
          <div><p className="result-label">01 / {current ? 'Your assigned direction' : 'Leave the brief to chance'}</p><h2 id="draw-title">{current ? 'The brief is set.' : 'Meet your next brand.'}</h2></div>
          <p className="workbench-note">{current ? 'Your creative constraint. Keep it.' : 'No rerolls. Make the unexpected work.'}</p>
        </div>
        <div className={`machine${showMood ? ' machine-with-mood' : ''}`} aria-label="Roulette reels" aria-busy={spinning}>
        {reels.map((r) => (<Reel key={r.key} label={r.label} items={items[r.key]} value={displayedPick[r.key]} plan={plans[r.key] ?? null} delay={r.delay} assigned={!!current || !!challenge} long={r.long} compact={r.extra} onStop={handleStop}/>))}
        </div>

      <div className="controls">
        <button type="button" className="spin" onClick={() => spin()} disabled={spinning || !!challenge || !!current} aria-describedby="spin-hint">
          <span>
            {spinning
            ? "Spinning"
            : current ? "Your challenge is assigned" : "Spin for your challenge"}
          </span>
          {!current && <span className="key">Space</span>}
          <ActionIcon name={current ? 'lock' : 'spin'} className="spin-arrow" />
        </button>
        <p className="hint" id="spin-hint">
          {current ? 'This is your project for the week. Build the entire brand around this result.' : 'The result is final. Accept your challenge to start the seven-day clock.'}
        </p>

        <div className="toggles">
          <button type="button" className="lock chip" aria-pressed={showMood} onClick={() => setExtras((v) => !v)} disabled={spinning || !!challenge || !!current}>
            Extra reels{" "}
            <small aria-hidden="true">{showMood ? "mood on" : "mood off"}</small>
          </button>
          <button type="button" className="lock chip" aria-pressed={soundOn} onClick={toggleSound}>
            Sound <small aria-hidden="true">{soundOn ? "on" : "off"}</small>
          </button>
          <button type="button" className="lock chip" onClick={dailyBrief} disabled={spinning || !!challenge || !!current}>
            Today&apos;s challenge
          </button>
        </div>
      </div>
      </section>

      <div aria-live="polite">
        {current && (<section className="result" aria-labelledby="assigned-brand">
            <div className="section-heading"><p className="result-label">{challenge?.finishedAt ? 'Your finished brand' : challenge?.acceptedAt ? 'Your project for the week' : 'Your challenge / Assigned'}</p><span className="assignment-stamp">{challenge?.finishedAt ? 'Completed' : 'One brand · Seven days'}</span></div>
            <div className="result-row">
              <h2 className="brief" id="assigned-brand" tabIndex={-1}>
                <strong>{current.brand}</strong>{' '}<span className="brief-category">{current.category} brand</span>
                {current.mood && (<span className="brief-mood">Mood: <strong>{current.mood}</strong></span>)}
              </h2>

              <div className="result-actions">
                <button type="button" className="copy" onClick={() => copy("brief")}>
                  {copied === "brief" ? "Copied" : "Copy brief"}
                </button>
                <button type="button" className="copy" onClick={() => copy("link")}>
                  {copied === "link" ? "Link copied" : "Copy link"}
                </button>
                <button type="button" className="copy" onClick={save} disabled={isSaved || savedApi.saved.length >= MAX_SAVED || spinning}>
                  {isSaved ? "Saved" : savedApi.saved.length >= MAX_SAVED ? "Saved list full" : "Save brief"}
                </button>
              </div>
            </div>
            <p className="result-mission">Take this name and creative territory. Build its concept, identity, and complete digital experience from the ground up.</p>
            {fromLink && challenge && challenge.drawnAt === initialDrawAt && !sameBrief(fromLink, challenge.brief) && <p className="hint">You already have an assigned brand. Finish it before taking on a shared challenge.</p>}

            {!challenge?.acceptedAt && <div className="accept-row"><button type="button" className="copy primary" onClick={accept} disabled={spinning}>Accept challenge <ActionIcon name="right" /></button><p>Make it official. Your seven days start when you accept.</p></div>}

            {copyFailed && (<div className="copy-fallback" role="status">
                <p>This browser blocked copying. Select and copy the text below.</p>
                <textarea aria-label="Text to copy" readOnly value={sentence + "\n" + `${window.location.origin}${window.location.pathname}?${search}`} onFocus={(event) => event.currentTarget.select()}/>
              </div>)}

            <CategoryNote name={current.category}/>
          </section>)}
      </div>

      {challenge?.acceptedAt && (<ChallengePlan challenge={challenge} onToggle={toggleMilestone} onFinish={finish} onNext={nextChallenge}/>)}

      {!challenge?.acceptedAt && <ChallengeScope />}

      {history.length > 1 && (<section className="history">
          <p className="result-label">Previous assignments</p>
          <ul>
            {history.slice(1).map((h, i) => (<li key={i}>
                {[h.brand, h.category, h.mood]
                    .filter((x): x is string => x !== null)
                    .join(" × ")}
              </li>))}
          </ul>
        </section>)}

      {savedApi.saved.length > 0 && (<SavedBriefs saved={savedApi.saved} onToggle={savedApi.toggleDone} onRemove={savedApi.remove}/>)}

      <Suspense fallback={<div className="guide-loading" role="status">Loading your design workbench…</div>}>
        <UiStyleGuide brief={current} revision={designRevision}/>
      </Suspense>

      <CustomEntries custom={custom} busy={spinning} onAdd={addCustom} onRemove={removeCustom}/>

      <footer className="footer">
        <span>Leave the brief to chance. Make the work your own.</span>
        <span>
          © {new Date().getFullYear()}{" "}
          <a href="https://snowi-cambronero.vercel.app/" target="_blank" rel="noopener noreferrer">
            snowi
          </a>
        </span>
      </footer>
    </main>);
}
