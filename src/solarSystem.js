import * as THREE from 'three'

// Imperative three.js scene: a small solar system with one planet per portfolio section,
// and a ship the visitor flies between them. Drives the DOM rendered by App directly.
// Returns a cleanup function that stops the loop, removes listeners and frees the GPU context.
export function startSolarSystem(root) {
  const $ = (sel) => root.querySelector(sel)
  const ac = new AbortController()
  const signal = ac.signal

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const cs = getComputedStyle(document.documentElement)
  const cssColor = (n) => new THREE.Color(cs.getPropertyValue(n).trim())
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
  const UP = V(0, 1, 0)
  // Lights are physically based since three r155; scale to match the original legacy-mode look
  const LI = Math.PI

  // The canvas is created here rather than by React, so a remount always gets a fresh WebGL context
  const canvas = document.createElement('canvas')
  canvas.id = 'scene'
  canvas.setAttribute('aria-hidden', 'true')
  root.prepend(canvas)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400)

  // ---------- helpers ----------
  const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.55)')
    g.addColorStop(0.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g; x.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  })()
  const glow = (color, size, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending }))
    s.scale.set(size, size, 1); return s
  }
  function planetTex(color, seed) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256
    const x = c.getContext('2d'); const r = rng(seed)
    for (let y = 0; y < 256; y++) {
      const n = Math.sin(y * 0.045 + seed) * 0.5 + Math.sin(y * 0.16 + seed * 2) * 0.3 + r() * 0.15
      x.fillStyle = color.clone().offsetHSL(0, -0.05, (n - 0.25) * 0.2).getStyle(); x.fillRect(0, y, 512, 1)
    }
    for (let i = 0; i < 60; i++) {
      x.fillStyle = 'rgba(255,255,255,' + (r() * 0.07).toFixed(3) + ')'
      x.beginPath(); x.ellipse(r() * 512, r() * 256, r() * 50 + 6, r() * 7 + 2, 0, 0, Math.PI * 2); x.fill()
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }

  // ---------- light, stars, the sun ----------
  scene.add(new THREE.AmbientLight(0x404a80, 0.4 * LI))
  scene.add(new THREE.PointLight(0xfff1dc, 1.7 * LI, 0, 0))
  const fill = new THREE.DirectionalLight(0x8a96ff, 0.35 * LI); fill.position.set(-5, 6, 10); scene.add(fill)
  const key = new THREE.DirectionalLight(0xffffff, 0.45 * LI); scene.add(key); scene.add(key.target) // follows the camera so the ship always reads
  const stars = (() => {
    const N = 3200, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), r = rng(7)
    const tints = [new THREE.Color('#ffffff'), new THREE.Color('#c9d0ff'), new THREE.Color('#ffe2bf')]
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 70 + r() * 130, s = Math.sqrt(1 - u * u)
      pos.set([Math.cos(th) * s * rad, u * rad, Math.sin(th) * s * rad], i * 3)
      const t = tints[(r() * 3) | 0].clone().multiplyScalar(0.45 + r() * 0.55); col.set([t.r, t.g, t.b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.9, map: glowTex, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    scene.add(pts)
    const n1 = glow(cssColor('--p-screen'), 140, 0.1); n1.position.set(-60, 25, -90); scene.add(n1)
    const n2 = glow(cssColor('--p-data'), 110, 0.07); n2.position.set(70, -30, -80); scene.add(n2)
    return pts
  })()
  const sun = new THREE.Group(); scene.add(sun)
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 48, 32), new THREE.MeshBasicMaterial({ color: 0xfff0d6 })))
  sun.add(glow(new THREE.Color('#ffd9a0'), 9, 0.85), glow(new THREE.Color('#ff9f5a'), 22, 0.22))

  // ---------- labels ----------
  const labelsEl = $('#labels'), labels = []
  const addLabel = (text, obj, cls, stop) => {
    const el = document.createElement('div'); el.className = 'tag ' + cls; el.textContent = text
    labelsEl.appendChild(el); labels.push({ el, obj, cls, stop })
  }

  // ---------- flags ----------
  const cloths = []
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xdedcf0, metalness: 0.6, roughness: 0.3 })
  function plantFlag(parent, y, color, h) {
    const flag = new THREE.Group(); flag.position.y = y; parent.add(flag)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, h, 8), poleMat); pole.position.y = h / 2; flag.add(pole)
    const g = new THREE.PlaneGeometry(0.52, 0.32, 14, 4); g.translate(0.26, 0, 0)
    const cloth = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45,
      side: THREE.DoubleSide, roughness: 0.6 }))
    cloth.position.y = h - 0.17; flag.add(cloth)
    cloths.push({ g, base: g.attributes.position.array.slice() })
    const tip = new THREE.Object3D(); tip.position.y = h + 0.04; flag.add(tip)
    const beacon = glow(color, 0.5, 0.9); beacon.position.y = h + 0.04; flag.add(beacon)
    return tip
  }

  // ---------- planets ----------
  const DEF = [
    { name: 'About', kind: 'ring', r: 0.9, orbit: 22.5, speed: 0.008, phase: 1.2, color: cssColor('--p-about'), moons: ['Mentoring', 'Leadership', 'Code review'] },
    { name: 'Screen', kind: 'tiles', r: 1.0, orbit: 6.5, speed: 0.03, phase: 0.5, color: cssColor('--p-screen'), moons: ['React', 'Next.js', 'Vue'] },
    { name: 'Server', kind: 'wire', r: 1.3, orbit: 10.5, speed: 0.02, phase: 1.9, color: cssColor('--p-server'), moons: ['Node.js', 'Express', 'GraphQL'] },
    { name: 'Data', kind: 'bands', r: 1.15, orbit: 14.5, speed: 0.014, phase: 3.1, color: cssColor('--p-data'), moons: ['MongoDB', 'Mongoose', 'SQL'] },
    { name: 'Experience', kind: 'rocks', r: 0.95, orbit: 18.5, speed: 0.01, phase: 4.3, color: cssColor('--p-exp'), moons: ['Skillrev', 'Koyal', 'Aggregate Intelligence', 'Cogen'] },
  ]
  const planets = DEF.map((d, i) => {
    const group = new THREE.Group(); scene.add(group)
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.r, 48, 32),
      new THREE.MeshStandardMaterial({ map: planetTex(d.color, 11 + i * 17), roughness: 0.85 }))
    mesh.rotation.z = 0.3; group.add(mesh)
    const atmo = glow(d.color, d.r * 4.2, 0.35); group.add(atmo)
    const detailMat = new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.75 })
    const detail = new THREE.Group(); group.add(detail)
    if (d.kind === 'ring') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(d.r * 1.5, d.r * 2.1, 96),
        new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }))
      ring.rotation.x = Math.PI / 2; detail.add(ring)
      detail.rotation.x = 0.35
    } else if (d.kind === 'tiles') {
      for (let k = 0; k < 56; k++) {
        const a = k / 56 * Math.PI * 2, rr = d.r * (1.75 + (k % 3) * 0.12)
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.16 + (k % 4) * 0.04, 0.02, 0.1), detailMat)
        tile.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); tile.rotation.y = -a; detail.add(tile)
      }
      detail.rotation.x = 0.45
    } else if (d.kind === 'wire') {
      detail.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(d.r * 1.35, 1)),
        new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: 0.35 })))
    } else if (d.kind === 'bands') {
      [-0.55, 0, 0.55].forEach((y) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(d.r * 1.32 * Math.cos(y * 0.9), 0.025, 8, 80), detailMat)
        ring.rotation.x = Math.PI / 2; ring.position.y = y * d.r; detail.add(ring)
      })
    } else {
      const rr = rng(99), rock = new THREE.MeshStandardMaterial({ color: d.color.clone().offsetHSL(0, -0.3, -0.1), roughness: 1 })
      for (let k = 0; k < 46; k++) {
        const a = rr() * Math.PI * 2, rad = d.r * (1.7 + rr() * 0.5)
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04 + rr() * 0.06, 0), rock)
        m.position.set(Math.cos(a) * rad, (rr() - 0.5) * 0.12, Math.sin(a) * rad); detail.add(m)
      }
      detail.rotation.x = -0.25
    }
    const moons = d.moons.map((m, k) => {
      const pivot = new THREE.Object3D(); pivot.rotation.x = (k - 1) * 0.35; group.add(pivot)
      const spin = new THREE.Object3D(); pivot.add(spin)
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.14 + (k % 3) * 0.03, 20, 14),
        new THREE.MeshStandardMaterial({ color: d.color.clone().offsetHSL(0, -0.2, 0.15), roughness: 0.9 }))
      moon.position.x = d.r * 2.6 + k * 0.6; spin.add(moon)
      addLabel(m, moon, 'moon', i + 1)
      return { spin, phase: k * 2.1 + i, speed: 0.4 - k * 0.07 }
    })
    const tip = plantFlag(group, d.r * 0.97, d.color, 0.7 + d.r * 0.35)
    addLabel(d.name, tip, 'planet', i + 1)
    const pts = []; for (let k = 0; k <= 160; k++) { const a = k / 160 * Math.PI * 2; pts.push(V(Math.cos(a) * d.orbit, 0, Math.sin(a) * d.orbit)) }
    const orbitMat = new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: 0.16 })
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat))
    return Object.assign({}, d, { group, mesh, atmo, detail, moons, tip, orbitMat, flash: 0 })
  })

  // ---------- contact station ----------
  const station = new THREE.Group(); scene.add(station)
  const stationOrbit = 4.4;
  (() => {
    const m = new THREE.MeshStandardMaterial({ color: 0xdedcf0, metalness: 0.6, roughness: 0.35 })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 12, 48), m); ring.rotation.x = Math.PI / 2; station.add(ring)
    ;[0, Math.PI / 2].forEach((a) => { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.035, 0.035), m); sp.rotation.y = a; station.add(sp) })
    station.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 16), m))
    const pm = new THREE.MeshStandardMaterial({ color: 0x2b3a8a, metalness: 0.4, roughness: 0.3, emissive: 0x1a2a7a, emissiveIntensity: 0.5 })
    ;[-1, 1].forEach((sx) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.32), pm); p.position.x = sx * 1.05; station.add(p) })
    ;[0, 1, 2, 3].forEach((k) => {
      const g = glow(cssColor(['--p-screen', '--p-server', '--p-data', '--p-exp'][k]), 0.3, 1)
      g.position.set(Math.cos(k * Math.PI / 2) * 0.6, 0, Math.sin(k * Math.PI / 2) * 0.6); station.add(g)
    })
  })()
  const STATION = planets.length + 1
  const stationTip = plantFlag(station, 0.22, cssColor('--p-contact'), 0.75)
  addLabel('Contact', stationTip, 'planet', STATION)
  const stationFlash = { flash: 0 }

  // ---------- spacecraft ----------
  const ship = new THREE.Group(); scene.add(ship);
  (() => {
    const hull = new THREE.MeshStandardMaterial({ color: 0xe9e8f5, metalness: 0.55, roughness: 0.35 })
    const trim = new THREE.MeshStandardMaterial({ color: cssColor('--p-screen'), metalness: 0.3, roughness: 0.4,
      emissive: cssColor('--p-screen'), emissiveIntensity: 0.35 })
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.16, 0.8, 20), hull); fus.rotation.x = Math.PI / 2; ship.add(fus)
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0x9fb0ff, metalness: 0.2, roughness: 0.1, emissive: 0x3344aa, emissiveIntensity: 0.6 }))
    cockpit.position.set(0, 0.07, 0.12); cockpit.scale.set(1, 0.8, 1.7); ship.add(cockpit)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.025, 0.22), hull); wing.position.z = -0.16; ship.add(wing)
    ;[-1, 1].forEach((sx) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.26), trim); t.position.set(sx * 0.48, 0, -0.16); ship.add(t) })
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, 0.18), trim); fin.position.set(0, 0.11, -0.3); ship.add(fin)
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0x555a77, metalness: 0.7, roughness: 0.4 }))
    nozzle.rotation.x = Math.PI / 2; nozzle.position.z = -0.44; ship.add(nozzle)
  })()
  const flame = glow(cssColor('--p-server'), 0.9, 0.9); flame.position.z = -0.62; ship.add(flame)
  const flameCore = glow(new THREE.Color('#ffffff'), 0.3, 1); flameCore.position.z = -0.54; ship.add(flameCore)
  ship.scale.setScalar(1.15)

  const TRAIL = 120, trailPos = new Float32Array(TRAIL * 3), trailCol = new Float32Array(TRAIL * 3), trailPts = []
  const trailGeo = new THREE.BufferGeometry()
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3))
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false }))
  trail.frustumCulled = false; scene.add(trail)
  const EXHAUST = cssColor('--p-server')

  // ---------- the route: launch, then Screen, Server, Data, Experience, Contact, and round again ----------
  const LAUNCH = V(0, 3, 30) // out in empty space, facing away from the system
  const STOP_NAMES = ['Launch', ...DEF.map((d) => d.name), 'Contact']
  const N = STATION, idx = (k) => (k <= 0 ? 0 : ((k - 1) % N) + 1)
  function body(i) {
    const isStation = i === STATION, obj = isStation ? station : planets[i - 1].group
    const r = isStation ? 0.7 : planets[i - 1].r, c = obj.position.clone()
    const orbit = isStation ? stationOrbit : planets[i - 1].orbit
    const sw = c.clone().setY(0).normalize().negate(), tan = V(-sw.z, 0, sw.x)
    return { c, r, sw, tan, orbit, tip: isStation ? stationTip : planets[i - 1].tip }
  }
  function anchorAt(i, out) {
    if (i === 0) return out.copy(LAUNCH)
    const b = body(i)
    return out.copy(b.c).addScaledVector(b.sw, b.r * 1.9).addScaledVector(b.tan, b.r * 0.8).addScaledVector(UP, b.r * 1.5)
  }
  const A0 = V(), A1 = V(), M = V()
  function routePoint(sv, out) {
    const k = Math.floor(sv), f = sv - k
    anchorAt(idx(k), A0); anchorAt(idx(k + 1), A1)
    M.copy(A0).add(A1).multiplyScalar(0.5); M.y += A0.distanceTo(A1) * 0.22 + 1.2
    const u = 1 - f
    return out.set(0, 0, 0).addScaledVector(A0, u * u).addScaledVector(M, 2 * u * f).addScaledVector(A1, f * f)
  }
  function segLen(k) { anchorAt(idx(k), A0); anchorAt(idx(k + 1), A1); return Math.max(1, A0.distanceTo(A1) * 1.15) }

  // ---------- flight state ----------
  const nav = { mode: 'intro', s: 0, v: 0, target: null, pressing: false, t0: 0, docked: 0 }
  const boost = $('#boost'), control = $('#control')
  const hint = $('#hint'), live = $('#live')
  const stopsNav = $('#stops'), stopBtns = [...stopsNav.querySelectorAll('button')]
  const boards = [...root.querySelectorAll('.board')]
  const tether = $('#tetherLine')

  function explore() {
    if (nav.mode !== 'intro') return
    nav.mode = 'fly'; boost.textContent = 'Boost'
    control.classList.add('flying'); control.style.left = control.style.top = ''
    stopsNav.hidden = false
    hint.textContent = 'Hold Boost to fly. Tap it to jump to the next planet.'
    live.textContent = 'Ready for launch. Next stop: ' + STOP_NAMES[1] + '.'
  }
  // While the ship is on its way to a stop, Boost is locked until it docks
  function setTransit(on) {
    boost.classList.toggle('busy', on); boost.setAttribute('aria-disabled', on ? 'true' : 'false')
    if (on) boost.textContent = 'Flying…'
  }
  function press() {
    if (nav.mode !== 'fly' || nav.pressing || nav.target !== null) return
    nav.pressing = true; nav.t0 = performance.now(); boost.classList.add('held'); boost.textContent = 'Boost'; undock()
  }
  function release() {
    if (!nav.pressing) return
    nav.pressing = false; boost.classList.remove('held')
    const tap = performance.now() - nav.t0 < 220
    nav.target = Math.floor(nav.s + 1e-6) + 1
    if (reduce && tap) arrive(); else setTransit(true)
  }
  function flyToStop(i) {
    if (nav.mode === 'intro') explore()
    if (nav.docked === i) return
    let k = Math.floor(nav.s + 1e-6) + 1; while (idx(k) !== i) k++
    undock(); nav.target = k; if (reduce) arrive(); else setTransit(true)
  }
  function undock() { if (nav.docked) { nav.docked = 0; showBoard(0); boost.textContent = 'Boost' } }
  function arrive() {
    nav.s = nav.target; nav.v = 0; nav.target = null; setTransit(false)
    const i = idx(nav.s); nav.docked = i; showBoard(i)
    if (i === STATION) stationFlash.flash = 1; else planets[i - 1].flash = 1
    if (i === STATION) {
      boost.textContent = 'Fly again'
      hint.textContent = "That's the last station. Tap Fly again to go back to " + STOP_NAMES[1] + '.'
      live.textContent = 'Well, here we are at the last station: Contact.'
    } else {
      boost.textContent = 'Boost'
      hint.textContent = 'Next stop: ' + STOP_NAMES[idx(nav.s + 1)] + '. Hold Boost to fly, or tap it.'
      live.textContent = 'Arrived at ' + STOP_NAMES[i] + '.'
    }
  }
  function showBoard(i) {
    boards.forEach((b) => { const on = +b.dataset.stop === i; b.classList.toggle('on', on); b.setAttribute('aria-hidden', on ? 'false' : 'true') })
    stopBtns.forEach((b) => b.setAttribute('aria-current', +b.dataset.go === i ? 'true' : 'false'))
  }
  showBoard(0)

  const opts = { signal }
  boost.addEventListener('click', () => { if (nav.mode === 'intro') explore() }, opts)
  boost.addEventListener('pointerdown', (e) => { if (nav.mode !== 'fly') return; e.preventDefault(); boost.setPointerCapture(e.pointerId); press() }, opts)
  ;['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => boost.addEventListener(t, release, opts))
  boost.addEventListener('contextmenu', (e) => e.preventDefault(), opts)
  const isBoostKey = (e) => e.key === ' ' || e.key === 'Enter'
  boost.addEventListener('keydown', (e) => { if (nav.mode === 'fly' && isBoostKey(e)) { e.preventDefault(); if (!e.repeat) press() } }, opts)
  boost.addEventListener('keyup', (e) => { if (isBoostKey(e)) { e.preventDefault(); release() } }, opts)
  // Space anywhere else on the page also works as the throttle
  const onControl = (e) => e.target.closest?.('button,a')
  addEventListener('keydown', (e) => {
    if (e.key !== ' ' || onControl(e)) return
    e.preventDefault(); if (nav.mode === 'intro') explore(); else if (!e.repeat) press()
  }, opts)
  addEventListener('keyup', (e) => { if (e.key === ' ' && !onControl(e)) release() }, opts)
  stopBtns.forEach((b) => b.addEventListener('click', () => flyToStop(+b.dataset.go), opts))

  function updateFlight(dt) {
    if (nav.mode !== 'fly') return
    if (nav.pressing) nav.v = Math.min(nav.v + 16 * dt, 22)
    else if (nav.target !== null) {
      const dist = (nav.target - nav.s) * segLen(Math.floor(nav.s))
      const want = Math.max(0.9, Math.min(15, dist * 1.6))
      nav.v += (want - nav.v) * Math.min(1, dt * 3)
    } else nav.v = 0
    if (nav.v > 0) nav.s += nav.v * dt / segLen(Math.floor(nav.s))
    if (!nav.pressing && nav.target !== null && nav.s >= nav.target - 1e-4) arrive()
  }

  // ---------- camera ----------
  const tPos = V(), tLook = V(), camPos = V(), camLook = V(), fwd = V(), tmp = V()
  const aimer = new THREE.Object3D()
  function introCam() { tPos.copy(LAUNCH).add(V(-0.8, 0.7, -3.2)); tLook.copy(LAUNCH).add(V(-0.75, 0.05, 0)) }
  function dockCam(i) {
    const b = body(i)
    if (i === STATION) { tPos.copy(b.c).addScaledVector(b.sw, 0.8).addScaledVector(b.tan, 4.2).addScaledVector(UP, 2.6) }
    else {
      const d = Math.min(b.r * 5, b.orbit * 0.45)
      tPos.copy(b.c).addScaledVector(b.sw, d).addScaledVector(b.tan, b.r * 4).addScaledVector(UP, b.r * 3.4)
    }
    tLook.copy(b.c).addScaledVector(UP, b.r * 1.1)
  }
  introCam(); camPos.copy(tPos); camLook.copy(tLook)
  let px = 0, py = 0
  if (!reduce) addEventListener('pointermove', (e) => { px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1 }, opts)
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() }
  addEventListener('resize', resize, opts)

  // ---------- screen-space helpers ----------
  const proj = (obj, out) => { obj.getWorldPosition(out); out.project(camera); return out }
  const toPx = (p) => [(p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight]

  // ---------- loop ----------
  let T = 0, last = performance.now(), raf = 0
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now; T += dt
    const OT = reduce ? 0 : T

    planets.forEach((p, i) => {
      const a = p.phase + OT * p.speed
      p.group.position.set(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit)
      p.mesh.rotation.y = OT * 0.2
      p.detail.rotation.y = OT * (p.kind === 'wire' ? -0.15 : 0.2)
      p.moons.forEach((m) => { m.spin.rotation.y = m.phase + OT * m.speed })
      p.flash = Math.max(0, p.flash - dt * 1.2)
      const docked = nav.docked === i + 1 ? 1 : 0, sc = p.r * 4.2 * (1 + p.flash * 0.8 + docked * 0.1)
      p.atmo.scale.set(sc, sc, 1); p.atmo.material.opacity = 0.3 + p.flash * 0.5 + docked * 0.1
      p.orbitMat.opacity = 0.14 + docked * 0.25 + p.flash * 0.3
    })
    const sa = 5.3 + OT * 0.05
    station.position.set(Math.cos(sa) * stationOrbit, 0.3, Math.sin(sa) * stationOrbit)
    station.rotation.y = OT * 0.25
    if (!reduce) {
      sun.rotation.y = T * 0.1; stars.rotation.y = T * 0.003
      cloths.forEach((c) => {
        const a = c.g.attributes.position.array
        for (let k = 0; k < a.length; k += 3) { const x = c.base[k]; a[k + 2] = Math.sin(x * 10 - T * 5) * 0.05 * (x / 0.52) }
        c.g.attributes.position.needsUpdate = true
      })
    }

    updateFlight(dt)

    // ship pose
    if (nav.mode === 'intro') {
      ship.position.copy(LAUNCH); ship.position.y += reduce ? 0 : Math.sin(T * 1.4) * 0.05
      aimer.position.copy(ship.position); aimer.lookAt(LAUNCH.x + 3, LAUNCH.y + 0.25, LAUNCH.z - 1.6)
      aimer.rotateZ(reduce ? 0 : Math.sin(T * 0.9) * 0.08)
    } else {
      routePoint(nav.s, ship.position)
      const L = segLen(Math.floor(nav.s))
      routePoint(nav.s + 0.6 / L, tmp)
      if (!nav.v && !reduce) ship.position.y += Math.sin(T * 1.6) * 0.05
      aimer.position.copy(ship.position); aimer.lookAt(tmp)
      aimer.rotateZ(nav.pressing ? Math.sin(T * 3) * 0.12 : 0)
    }
    ship.quaternion.slerp(aimer.quaternion, reduce ? 1 : 1 - Math.exp(-dt * 5))
    const speed = Math.min(nav.v / 22, 1)
    const fl = (0.45 + speed * 1.7) * (reduce ? 1 : 0.85 + Math.sin(T * 40) * 0.15)
    flame.scale.set(fl, fl, 1); flameCore.scale.set(fl * 0.35, fl * 0.35, 1)

    ship.updateMatrixWorld()
    tmp.set(0, 0, -0.6); ship.localToWorld(tmp)
    trailPts.unshift(tmp.clone()); if (trailPts.length > TRAIL) trailPts.pop()
    const bright = 0.25 + speed * 0.9
    for (let i = 0; i < TRAIL; i++) {
      const p = trailPts[Math.min(i, trailPts.length - 1)], f = (1 - i / TRAIL) * bright
      trailPos.set([p.x, p.y, p.z], i * 3); trailCol.set([EXHAUST.r * f, EXHAUST.g * f, EXHAUST.b * f], i * 3)
    }
    trailGeo.setDrawRange(0, nav.mode === 'intro' ? 0 : trailPts.length)
    trailGeo.attributes.position.needsUpdate = trailGeo.attributes.color.needsUpdate = true

    // camera: close-up in the intro, chase while flying, a planet view when docked
    let rate = 3
    if (nav.mode === 'intro') introCam()
    else if (nav.docked) { dockCam(nav.docked); rate = 2.2 }
    else {
      ship.getWorldDirection(fwd)
      tPos.copy(ship.position).addScaledVector(fwd, -6.5 - speed * 1.5).addScaledVector(UP, 2.3)
      tLook.copy(ship.position).addScaledVector(fwd, 3)
      rate = 4.5
    }
    tPos.x += px * 0.35; tPos.y -= py * 0.25
    const k = reduce ? 1 : 1 - Math.exp(-dt * rate)
    camPos.lerp(tPos, k); camLook.lerp(tLook, k)
    camera.position.copy(camPos); camera.lookAt(camLook)
    key.position.copy(camPos).add(V(0, 2, 0)); key.target.position.copy(camLook)
    const fov = 40 + speed * 22
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix()

    renderer.render(scene, camera)

    // labels
    labels.forEach((L) => {
      proj(L.obj, tmp); const [x, y] = toPx(tmp)
      let show = tmp.z < 1 && nav.mode === 'fly'
      if (L.cls === 'planet') show = show && nav.docked !== L.stop
      else show = show && nav.docked === L.stop
      L.el.style.transform = 'translate(' + (x + 10).toFixed(1) + 'px,' + (y - 12).toFixed(1) + 'px)'
      L.el.style.opacity = show ? (L.cls === 'planet' ? 0.9 : 1) : 0
    })

    // Explore button sits beside the ship in the intro
    if (nav.mode === 'intro') {
      proj(ship, tmp); const [sx, sy] = toPx(tmp)
      const cw = control.offsetWidth, ch = control.offsetHeight, narrow = innerWidth < 760
      let lx = narrow ? sx - cw / 2 : sx + Math.min(360, innerWidth * 0.24), ly = narrow ? sy + innerHeight * 0.2 : sy - ch / 2
      lx = Math.max(16, Math.min(innerWidth - cw - 16, lx)); ly = Math.max(80, Math.min(innerHeight - ch - 24, ly))
      control.style.left = lx.toFixed(0) + 'px'; control.style.top = ly.toFixed(0) + 'px'
    }

    // the active board hangs off its flag
    const board = nav.docked ? boards[nav.docked - 1] : null
    if (board && innerWidth >= 760) {
      proj(body(nav.docked).tip, tmp); const [fx, fy] = toPx(tmp)
      const bw = board.offsetWidth, bh = board.offsetHeight, gap = 56
      const left = fx > innerWidth * 0.5 ? fx - bw - gap : fx + gap
      const bx = Math.max(16, Math.min(innerWidth - bw - 16, left))
      const by = Math.max(84, Math.min(innerHeight - bh - 150, fy - bh * 0.35))
      board.style.left = bx.toFixed(0) + 'px'; board.style.top = by.toFixed(0) + 'px'
      const ex = fx > bx + bw / 2 ? bx + bw : bx, ey = Math.max(by + 20, Math.min(by + bh - 20, fy))
      tether.setAttribute('x1', fx.toFixed(1)); tether.setAttribute('y1', fy.toFixed(1))
      tether.setAttribute('x2', ex.toFixed(1)); tether.setAttribute('y2', ey.toFixed(1))
      tether.style.stroke = getComputedStyle(board).getPropertyValue('--c')
      tether.setAttribute('opacity', board.classList.contains('on') ? '.8' : '0')
    } else tether.setAttribute('opacity', '0')

    raf = requestAnimationFrame(frame)
  }
  resize(); raf = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(raf)
    ac.abort()
    scene.traverse((o) => {
      o.geometry?.dispose()
      ;[].concat(o.material ?? []).forEach((m) => { m.map?.dispose(); m.dispose() })
    })
    renderer.dispose(); renderer.forceContextLoss()
    canvas.remove()
    labelsEl.replaceChildren()
    // Put the DOM back in its intro state so a remount (StrictMode, hot reload) starts clean
    showBoard(0); tether.setAttribute('opacity', '0')
    control.classList.remove('flying'); control.style.left = control.style.top = ''
    boost.classList.remove('held', 'busy'); boost.removeAttribute('aria-disabled'); boost.textContent = 'Explore'
    hint.textContent = 'Fly through my work, one planet at a time.'; live.textContent = ''
    stopsNav.hidden = true
  }
}
