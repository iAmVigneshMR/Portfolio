import { lazy, Suspense, useEffect, useState } from 'react'
import { education, experience, profile, skills, stats } from './data'

const Scene = lazy(() => import('./components/Scene'))

const nav = ['about', 'skills', 'experience', 'education', 'contact']

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.12 },
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <a href="#top" className="logo">
        VMR<span>.</span>
      </a>
      <button className="menu-btn" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
        <span /><span /><span />
      </button>
      <nav className={open ? 'open' : ''}>
        {nav.map((id) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
            {id}
          </a>
        ))}
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section id="top" className="hero">
      <div className="hero-text">
        <p className="mono eyebrow">Hi, my name is</p>
        <h1>{profile.name}</h1>
        <h2>
          <span className="gradient">{profile.title}</span> crafting fast, scalable web experiences.
        </h2>
        <p className="lead">
          5+ years building React, Next.js, Vue.js and Node.js applications — from land-tax payment
          platforms processing $5M+ a year to analytics products serving thousands of users.
        </p>
        <div className="cta">
          <a className="btn primary" href="#experience">View my work</a>
          <a className="btn ghost" href={`mailto:${profile.email}`}>Get in touch</a>
        </div>
        <div className="socials">
          <a href={profile.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a href={`mailto:${profile.email}`}>Email</a>
        </div>
      </div>
      <a href="#about" className="scroll-hint" aria-label="Scroll down">
        <span />
      </a>
    </section>
  )
}

function SectionTitle({ index, children }) {
  return (
    <h2 className="section-title reveal">
      <span className="mono">0{index}.</span> {children}
    </h2>
  )
}

function About() {
  return (
    <section id="about">
      <SectionTitle index={1}>About Me</SectionTitle>
      <div className="about-grid">
        <p className="card reveal">{profile.summary}</p>
        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="card stat reveal">
              <strong className="gradient">{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Skills() {
  return (
    <section id="skills">
      <SectionTitle index={2}>Skills</SectionTitle>
      <div className="skills-grid">
        {Object.entries(skills).map(([group, list]) => (
          <div key={group} className="card reveal">
            <h3>{group}</h3>
            <ul className="chips">
              {list.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function Experience() {
  const [active, setActive] = useState(0)
  const job = experience[active]
  return (
    <section id="experience">
      <SectionTitle index={3}>Experience</SectionTitle>
      <div className="exp reveal">
        <div className="exp-tabs" role="tablist">
          {experience.map((e, i) => (
            <button
              key={e.company}
              role="tab"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onClick={() => setActive(i)}
            >
              {e.company}
            </button>
          ))}
        </div>
        <div className="card exp-panel" key={job.company}>
          <h3>
            {job.role} <span className="gradient">@ {job.company}</span>
          </h3>
          <p className="mono period">{job.period}</p>
          <ul className="points">
            {job.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <ul className="chips small">
            {job.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Education() {
  return (
    <section id="education">
      <SectionTitle index={4}>Education &amp; Training</SectionTitle>
      <ol className="timeline">
        {education.map((e) => (
          <li key={e.title} className="card reveal">
            <h3>{e.title}</h3>
            <p>{e.place}</p>
            {e.period && <p className="mono period">{e.period}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Contact() {
  return (
    <section id="contact" className="contact">
      <p className="mono eyebrow reveal">05. What's next?</p>
      <h2 className="reveal">Let's build something together.</h2>
      <p className="lead reveal">
        I'm open to new opportunities and collaborations. Whether you have a question or just want
        to say hi, my inbox is always open.
      </p>
      <div className="contact-links reveal">
        <a className="btn primary" href={`mailto:${profile.email}`}>{profile.email}</a>
        <a className="btn ghost" href={`tel:${profile.phone.replace(/\s/g, '')}`}>{profile.phone}</a>
      </div>
    </section>
  )
}

export default function App() {
  useReveal()
  return (
    <>
      <div className="canvas-wrap" aria-hidden="true">
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>
      <Header />
      <main>
        <Hero />
        <About />
        <Skills />
        <Experience />
        <Education />
        <Contact />
      </main>
      <footer>
        <p className="mono">Designed &amp; built by {profile.name} · React + Three.js</p>
      </footer>
    </>
  )
}
