import { useEffect, useRef } from 'react'
import { startSolarSystem } from './solarSystem'
import { education, experience, profile, skills, stack, stats } from './data'

// Route order: the board for stop N is the Nth .board in the DOM
const STOPS = [
  { go: 1, label: 'About', color: '--p-about' },
  { go: 2, label: 'Screen', color: '--p-screen' },
  { go: 3, label: 'Server', color: '--p-server' },
  { go: 4, label: 'Data', color: '--p-data' },
  { go: 5, label: 'Experience', color: '--p-exp' },
  { go: 6, label: 'Contact', color: '--p-contact' },
]

const accent = (name) => ({ '--c': `var(${name})` })

function Chips({ items }) {
  return (
    <ul className="chips">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
}

export default function App() {
  const root = useRef(null)

  useEffect(() => startSolarSystem(root.current), [])

  return (
    <div ref={root}>
      <div id="labels" aria-hidden="true" />
      <svg id="tether" aria-hidden="true">
        <line id="tetherLine" x1="0" y1="0" x2="0" y2="0" opacity="0" />
      </svg>

      <h1 className="brand">
        <span className="name">{profile.name}</span>
        <span className="role">Full stack developer</span>
      </h1>

      <nav className="stops" id="stops" aria-label="Destinations" hidden>
        {STOPS.map((s) => (
          <button key={s.go} data-go={s.go} style={accent(s.color)}>
            {s.label}
          </button>
        ))}
      </nav>

      <div className="control" id="control">
        <button className="boost" id="boost">Explore</button>
        <p className="hint" id="hint">Fly through my work, one planet at a time.</p>
      </div>
      <p className="sr" id="live" aria-live="polite" />

      <article className="board wide" data-stop="1" style={accent('--p-about')}>
        <h2>About me</h2>
        <dl className="stats">
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
        <p>{profile.summary}</p>
        <h3 className="sub">Soft skills</h3>
        <Chips items={skills['Soft Skills']} />
      </article>

      <article className="board" data-stop="2" style={accent('--p-screen')}>
        <h2>The screen</h2>
        <p>
          At Skillrev I'm moving legacy apps to React and Next.js, which has lifted Core Web Vitals
          by 35% across more than ten core modules.
        </p>
        <p>
          Before that I built the Vue and Vuetify front end of a US land-tax payment product,
          raising engagement by 25%, and map-heavy analytics dashboards with Mapbox and Apex Charts.
        </p>
        <Chips items={stack.screen} />
      </article>

      <article className="board" data-stop="3" style={accent('--p-server')}>
        <h2>The server</h2>
        <p>
          I design REST and GraphQL APIs in Node.js and Express. My latest work cut API response
          time by 120 ms.
        </p>
        <p>
          The land-tax platform I led processes over $5M a year at 99.9% uptime. I also keep CI/CD
          pipelines in shape: release turnaround is down 40% on Azure DevOps.
        </p>
        <Chips items={stack.server} />
      </article>

      <article className="board" data-stop="4" style={accent('--p-data')}>
        <h2>The data</h2>
        <p>
          Schemas shaped around how the app actually reads, and queries tuned until they're fast. On
          an SQL system serving 1,000+ daily users, my query work made retrieval 35% faster.
        </p>
        <Chips items={stack.data} />
      </article>

      <article className="board wide" data-stop="5" style={accent('--p-exp')}>
        <h2>Where I've worked</h2>
        <ol>
          {experience.map((job) => (
            <li key={job.company}>
              <h3>{job.company}</h3>
              <p className="muted">
                {job.role}, {job.period}
              </p>
              <ul className="points">
                {job.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Chips items={job.tags} />
            </li>
          ))}
        </ol>
        <h3 className="sub">Education</h3>
        <ol className="edu">
          {education.map((e) => (
            <li key={e.title}>
              <strong>{e.title}</strong>
              <span className="muted">
                {e.place}
                {e.period && `, ${e.period}`}
              </span>
            </li>
          ))}
        </ol>
      </article>

      <article className="board" data-stop="6" style={accent('--p-contact')}>
        <p className="end-note">Well, here we are at the last station. Thanks for flying with me.</p>
        <h2>Have something to build?</h2>
        <p>I take on full stack work, from the first screen to the production database.</p>
        <a className="email" href={`mailto:${profile.email}`}>{profile.email}</a>
        <p>
          <a className="phone" href={`tel:${profile.phone.replace(/\s/g, '')}`}>{profile.phone}</a>
          <span className="muted"> · {profile.location}</span>
        </p>
        <p className="links">
          <a href={profile.github}>GitHub</a>
          <a href={profile.linkedin}>LinkedIn</a>
          <a href="/Vignesh_M_R_-_Resume.pdf">Résumé</a>
        </p>
      </article>
    </div>
  )
}
