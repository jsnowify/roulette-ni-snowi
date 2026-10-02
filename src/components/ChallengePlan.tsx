import ActionIcon from './ActionIcon';
import { useEffect, useState } from 'react';
import { BUILD_PLAN, WEEK_MS, type Challenge } from '../lib/challenge';
const formatDate = (time: number) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(time);
export default function ChallengePlan({ challenge, onToggle, onFinish, onNext }: {
    challenge: Challenge;
    onToggle: (index: number) => void;
    onFinish: () => void;
    onNext: () => void;
}) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const refresh = () => setNow(Date.now());
        const timer = window.setInterval(refresh, 60000);
        document.addEventListener('visibilitychange', refresh);
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
    }, []);
    if (challenge.acceptedAt === null)
        return null;
    const due = challenge.acceptedAt + WEEK_MS;
    const count = challenge.completed.filter(Boolean).length;
    const days = Math.max(1, Math.min(7, Math.ceil((due - now) / (24 * 60 * 60 * 1000))));
    return (<section className="build-plan" aria-labelledby="plan-title">
      <div className="section-heading">
        <div><p className="result-label">02 / Build → Finish</p><h2 id="plan-title" tabIndex={-1}>Seven days. The whole brand.</h2></div>
        <p className="plan-status" role="status">{challenge.finishedAt ? 'Challenge complete' : now >= due ? 'Your week is up. Finish your showcase.' : `${days} ${days === 1 ? 'day' : 'days'} remaining`}<span>{count} of 7 milestones complete</span></p>
      </div>
      <p className="section-intro">A suggested rhythm for your week. Check off each milestone when the work is ready.</p>
      <p className="deadline">Started {formatDate(challenge.acceptedAt)} <span aria-hidden="true">/</span> Due <time dateTime={new Date(due).toISOString()}>{formatDate(due)}</time></p>
      <ol className="milestones">
        {BUILD_PLAN.map((day, index) => <li key={day.title} className={challenge.completed[index] ? 'is-complete' : ''}>
          <label><input type="checkbox" checked={challenge.completed[index]} disabled={challenge.finishedAt !== null} onChange={() => onToggle(index)}/><span className="day-number">Day {String(index + 1).padStart(2, '0')}</span><span className="day-work"><strong>{day.title}</strong><span>{day.work}</span></span></label>
        </li>)}
      </ol>
      <div className="plan-finish">
        {challenge.finishedAt ? <><p>You turned a constraint into a brand. Take it into your portfolio.</p><button className="copy" type="button" onClick={onNext}>Start your next challenge <ActionIcon name="right" /></button></> : <><p>{count === 7 ? 'Your brand is ready. Close out the week.' : 'Finish all seven milestones to complete your challenge.'}</p><button className="copy primary" type="button" disabled={count !== 7} onClick={onFinish}>Finish challenge <ActionIcon name="flag" /></button></>}
      </div>
    </section>);
}
