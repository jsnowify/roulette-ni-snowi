import ActionIcon from './ActionIcon';
type Stage = 'spin' | 'accept' | 'build' | 'finish';

export default function ChallengeIntro({ stage }: { stage: Stage }) {
  const steps = [
    { id: 'spin', label: 'Spin' },
    { id: 'accept', label: 'Accept' },
    { id: 'build', label: 'Build' },
    { id: 'finish', label: 'Finish' },
  ];

  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-main">
          <p className="eyebrow">A creative constraint for designers & developers</p>
          <h1 className="title" id="page-title">
            Roulette<br />ni snowi<span className="title-period" aria-hidden="true">.</span>
          </h1>
          <p className="hero-rule">One spin. One brand. One week.</p>
          <p className="intro">
            Whatever the roulette gives you becomes the brand you have to build.
            From the first idea to the final showcase. From scratch, in seven days.
          </p>
          {stage === 'spin' && <a className="hero-jump" href="#draw-title">Go to the roulette <ActionIcon name="down" /></a>}
        </div>
        <aside className="hero-contract" aria-label="The challenge rule">
          <p className="eyebrow">The time you get</p>
          <p className="week-number">07<span>days</span></p>
          <p className="contract-rule">
            You spin once.<br />You get the result.<br /><strong>You build it.</strong>
          </p>
          <p className="contract-note">Let chance set the brief.<br />Let your work make it yours.</p>
        </aside>
      </section>
      <ol className="process" aria-label="Challenge steps">
        {steps.map((step, index) => (
          <li key={step.id} aria-current={stage === step.id ? 'step' : undefined}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {step.label}
            {index < steps.length - 1 && <ActionIcon name="right" className="process-arrow" />}
          </li>
        ))}
      </ol>
    </>
  );
}

export function ChallengeScope() {
  const scope = [
    { title: 'Strategy & identity', work: 'Concept, positioning, brand name, logo, and graphic direction.' },
    { title: 'Design & development', work: 'Color, typography, UI design system, and a designed and developed website.' },
    { title: 'Assets & showcase', work: 'Brand assets, mockups, and a final presentation that brings it all together.' },
  ];
  return (
    <section className="scope" aria-labelledby="scope-title">
      <div>
        <p className="result-label">The full scope</p>
        <h2 id="scope-title">A brand, from zero<br />to out in the world.</h2>
        <p>More than a website. Every part should tell the same story.</p>
      </div>
      <ul>
        {scope.map((part, index) => (
          <li key={part.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div><strong>{part.title}</strong><p>{part.work}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
