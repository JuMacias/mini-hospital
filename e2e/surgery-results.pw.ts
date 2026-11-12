import { expect, test, type Page } from '@playwright/test'

const releaseViewports = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]

async function assertNoHorizontalOverflow(page: Page, viewport: { width: number; height: number }) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth > window.innerWidth,
    main: [...document.querySelectorAll('main')].some(element => element.scrollWidth > element.clientWidth),
  }))
  expect(overflow.document || overflow.main, `Desbordamiento horizontal en ${viewport.width}x${viewport.height}`).toBe(false)
}

async function prepareSurgery(page: Page, difficulty = 'normal', checkResponsiveJourney = false) {
  await page.addInitScript(() => {
    let seed = 0x5eed1234
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return 0.91 + (seed / 0x1_0000_0000) * 0.08
    }
  })
  await page.goto('/')

  await page.getByRole('button', { name: /PASO 01/ }).click()
  await page.getByLabel('Nombre del personaje').fill('Dra. Mini Test')
  await page.getByRole('button', { name: 'Guardar personaje' }).click()
  await page.getByRole('button', { name: 'Volver', exact: true }).click()

  await page.getByRole('button', { name: /PASO 02/ }).click()
  await page.getByRole('button', { name: 'Retirar a Lucas Vidal' }).click()
  await page.locator('.team-professional-card').filter({ hasText: 'Nicolás Paz' }).click()
  await expect(page.locator('.team-counter')).toContainText('4')
  await expect(page.getByText('¡Formación completa!')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar favorito' }).click()
  await page.getByRole('button', { name: 'Volver al inicio' }).click()

  await page.getByRole('button', { name: /PASO 03/ }).click()

  if (await page.getByRole('button', { name: /Conocer a/ }).count()) {
    if (checkResponsiveJourney) {
      for (const viewport of releaseViewports) {
        await page.setViewportSize(viewport)
        await expect(page.getByRole('button', { name: /Conocer a/ }).first()).toBeVisible()
        await assertNoHorizontalOverflow(page, viewport)
      }
    }
    await page.getByRole('button', { name: /Conocer a/ }).first().click()
    for (let question = 0; question < 8; question += 1) {
      const consent = page.getByRole('button', { name: 'Sí, doy mi consentimiento' })
      if (await consent.count() && await consent.isEnabled()) break
      if (checkResponsiveJourney) {
        for (const viewport of releaseViewports) {
          await page.setViewportSize(viewport)
          await expect(page.locator('.response-option').first()).toBeVisible()
          await assertNoHorizontalOverflow(page, viewport)
        }
      }
      await page.locator('.response-option.response-empathetic').first().click()
    }
    await page.getByRole('button', { name: 'Sí, doy mi consentimiento' }).click()
    await page.getByRole('button', { name: 'Continuar a preparar quirófano' }).click()
    if (checkResponsiveJourney) {
      for (const viewport of releaseViewports) {
        await page.setViewportSize(viewport)
        await expect(page.locator('.task-row').first()).toBeVisible()
        await assertNoHorizontalOverflow(page, viewport)
      }
    }
    while (await page.locator('.task-row:not(.task-done)').count()) {
      await page.locator('.task-row:not(.task-done)').first().click()
    }
    await page.getByRole('button', { name: '¡Equipo y paciente listos!' }).click()
    await page.getByRole('button', { name: 'Ingresar al quirófano' }).click()
  }

  await page.getByLabel('DIFICULTAD').selectOption(difficulty)
  await page.getByRole('button', { name: 'Comenzar cirugía ficticia' }).click()
  await expect(page.getByRole('heading', { name: 'Verificación inicial' })).toBeVisible()

  if (checkResponsiveJourney) {
    for (const viewport of releaseViewports) {
      await page.setViewportSize(viewport)
      await expect(page.locator('.surgery-scene-host canvas')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Nombre del paciente', exact: true })).toBeVisible()
      await assertNoHorizontalOverflow(page, viewport)
      if (viewport.width === 390 && viewport.height === 844) {
        await expect(page.locator('.portrait-orientation')).toBeVisible()
      }
      if (viewport.width === 844 && viewport.height === 390) {
        await expect(page.locator('.portrait-orientation')).toBeHidden()
      }
    }
  }
}

async function resolvePositiveEvent(page: Page) {
  if (!await page.locator('.complication-overlay').count()) return
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const style = await page.locator('.reaction-track span').getAttribute('style')
    const position = Number.parseFloat(style?.match(/[\d.]+/)?.[0] ?? '0')
    if (position >= 45 && position <= 56) break
    await page.waitForTimeout(40)
  }
  await page.getByRole('button', { name: /Coordinar equipo/ }).click()
  if (await page.getByRole('button', { name: /Continuar misión/ }).count()) {
    await page.getByRole('button', { name: /Continuar misión/ }).click()
  }
}

async function completeChecklist(page: Page, first: string, second: string) {
  await page.getByRole('button', { name: first, exact: true }).click()
  await page.getByRole('button', { name: second, exact: true }).click()
  await page.getByRole('button', { name: /Confirmar selección|Comprobar/ }).click()
  await page.waitForTimeout(80)
  await resolvePositiveEvent(page)
}

async function completeCoordination(page: Page) {
  for (const role of ['Anestesia', 'Instrumentación', 'Asistencia']) {
    await page.getByRole('button', { name: role, exact: true }).click()
  }
  await page.waitForTimeout(80)
  await resolvePositiveEvent(page)
}

async function completePrecision(page: Page) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const style = await page.locator('.precision-track span').getAttribute('style')
    const position = Number.parseFloat(style?.match(/[\d.]+/)?.[0] ?? '0')
    if (position >= 48 && position <= 56) {
      await page.getByRole('button', { name: /Detener indicador/ }).click()
      await page.waitForTimeout(80)
      await resolvePositiveEvent(page)
      return
    }
    await page.waitForTimeout(40)
  }
  throw new Error('El indicador no alcanzó la zona de precisión dentro del tiempo esperado.')
}

test('completes a successful surgery and preserves its result after reload', async ({ page }) => {
  await prepareSurgery(page)
  await completeChecklist(page, 'Nombre del paciente', 'Equipo presente')
  await completeChecklist(page, 'Equipo presente', 'Señal del monitor')
  await completeCoordination(page)
  await completeCoordination(page)
  await expect(page.getByRole('heading', { name: 'Minijuego de precisión' })).toBeVisible()
  await completePrecision(page)
  await completePrecision(page)
  await expect(page.getByRole('heading', { name: 'Comprobación final' })).toBeVisible()
  await completeChecklist(page, 'Equipo coordinado', 'Paciente acompañado')
  await completeChecklist(page, 'Paciente acompañado', 'Sala en calma')

  await expect(page.getByRole('heading', { name: /¡Lo lograron/ })).toBeVisible()
  await expect(page.getByText('MISIÓN COMPLETADA')).toBeVisible()
  await expect(page.getByText(/Saldo actual/)).toBeVisible()
  await expect(page.getByText(/Historial reciente · 1 resultado/)).toBeVisible()

  const context = page.context()
  const beforeReopen = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('mini-hospital-save') ?? '{}').state
    return {
      coins: saved.coins,
      experience: saved.experience,
      rewards: saved.rewards,
      results: saved.surgeryHistory.length,
      doctorName: saved.doctor.name,
      selectedStaff: [...saved.selectedStaff].sort(),
    }
  })
  expect(beforeReopen.coins).toBeGreaterThan(0)
  expect(beforeReopen.results).toBe(1)
  expect(beforeReopen.selectedStaff).toContain('nicolas')

  await page.close()
  const reopened = await context.newPage()
  await reopened.goto('/')
  await expect(reopened.locator('.profile-mini')).toContainText('Dra. Mini Test')
  await reopened.getByRole('button', { name: 'Equipo médico', exact: true }).click()
  await expect(reopened.locator('.team-professional-card').filter({ hasText: 'Nicolás Paz' })).toHaveClass(/is-selected/)
  await expect(reopened.locator('.team-professional-card').filter({ hasText: 'Lucas Vidal' })).not.toHaveClass(/is-selected/)
  await reopened.getByRole('button', { name: 'Volver al inicio' }).click()
  await reopened.getByRole('button', { name: /PASO 03/ }).click()
  await reopened.getByRole('button', { name: 'Ingresar al quirófano' }).click()
  await expect(reopened.getByRole('heading', { name: /¡Lo lograron/ })).toBeVisible()
  await expect(reopened.getByText(/Resultados guardados: 1/)).toBeVisible()
  const afterReopen = await reopened.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('mini-hospital-save') ?? '{}').state
    return {
      coins: saved.coins,
      experience: saved.experience,
      rewards: saved.rewards,
      results: saved.surgeryHistory.length,
      doctorName: saved.doctor.name,
      selectedStaff: [...saved.selectedStaff].sort(),
    }
  })
  expect(afterReopen).toEqual(beforeReopen)
  await reopened.locator('.result-home').click()
  await expect(reopened.locator('canvas')).toHaveCount(0)
  await reopened.close()
})

test('records a failed surgery and allows a clean retry', async ({ page }) => {
  await prepareSurgery(page, 'hard')

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await page.getByRole('heading', { name: /La aventura terminó con una pérdida/ }).count()) break
    await page.getByRole('button', { name: 'Nombre del paciente', exact: true }).click()
    await page.getByRole('button', { name: 'Señal del monitor', exact: true }).click()
    await page.getByRole('button', { name: /Confirmar selección/ }).click()
    if (await page.getByRole('heading', { name: /La aventura terminó con una pérdida/ }).count()) break
    await page.locator('.complication-overlay').waitFor({ state: 'visible' })
    await page.getByRole('button', { name: /Coordinar equipo/ }).click()
    await page.waitForTimeout(80)
  }

  await expect(page.getByRole('heading', { name: 'La aventura terminó con una pérdida' })).toBeVisible()
  await expect(page.getByText('PÉRDIDA FICTICIA · EL EQUIPO ACOMPAÑÓ AL PACIENTE')).toBeVisible()
  await expect(page.getByText(/Historial reciente · 1 resultado/)).toBeVisible()
  for (const viewport of releaseViewports) {
    await page.setViewportSize(viewport)
    await expect(page.getByRole('heading', { name: 'La aventura terminó con una pérdida' })).toBeVisible()
    await assertNoHorizontalOverflow(page, viewport)
  }
  await page.reload()
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.getByRole('button', { name: /PASO 03/ }).click()
  await page.getByRole('button', { name: 'Ingresar al quirófano' }).click()
  await expect(page.getByRole('heading', { name: 'La aventura terminó con una pérdida' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver a operar' }).click()
  await expect(page.getByRole('heading', { name: 'Verificación inicial' })).toBeVisible()
  await expect(page.getByText('0 errores')).toBeVisible()
  await expect(page.getByText(/Resultados guardados: 1/)).toBeVisible()
})

test('persists independent audio volumes after browser reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  const musicVolume = page.getByRole('slider').first()
  await musicVolume.press('ArrowRight')
  const expectedValue = await musicVolume.inputValue()
  await page.reload()
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  await expect(page.getByRole('slider').first()).toHaveValue(expectedValue)
  await expect(page.getByRole('slider').nth(1)).toHaveValue('0.35')
})

test('keeps the surgery scene visible in portrait orientation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareSurgery(page)
  await expect(page.locator('.surgery-scene-host canvas')).toBeVisible()
  await expect(page.locator('.portrait-orientation')).toBeVisible()
  const notice = await page.locator('.portrait-orientation').evaluate(element => {
    const bounds = element.getBoundingClientRect()
    return {
      pointerEvents: getComputedStyle(element).pointerEvents,
      width: bounds.width,
      height: bounds.height,
    }
  })
  expect(notice.pointerEvents).toBe('none')
  expect(notice.width * notice.height).toBeLessThan(390 * 260 * 0.15)
  await expect(page.locator('.scene-loading')).toHaveCount(0)
  await expect(page.locator('.scene-load-error')).toHaveCount(0)
})

test('checks the full preop and surgery journey at release viewports', async ({ page }) => {
  await page.setViewportSize(releaseViewports[0])
  await prepareSurgery(page, 'normal', true)
})

test('measures initial browser load and confirms Phaser is lazy-loaded', async ({ page }) => {
  const requests: string[] = []
  page.on('requestfinished', request => requests.push(request.url()))
  const startedAt = Date.now()
  await page.goto('/')
  await expect(page.locator('.welcome-line')).toBeVisible()
  const initialLoadMs = Date.now() - startedAt
  const initialPhaserRequests = requests.filter(url => /phaser/i.test(url))
  expect(initialPhaserRequests).toHaveLength(0)

  const requestsBeforeSurgery = requests.length
  await prepareSurgery(page)
  await expect(page.locator('.surgery-scene-host canvas')).toBeVisible()
  const phaserRequests = requests.slice(requestsBeforeSurgery).filter(url => /phaser/i.test(url))
  expect(phaserRequests.length).toBeGreaterThan(0)
  const resources = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((entry): entry is PerformanceResourceTiming => /phaser/i.test(entry.name))
    .map(entry => ({
      durationMs: Math.round(entry.duration),
      transferBytes: entry.transferSize,
    })))
  const environment = process.env.PLAYWRIGHT_USE_PREVIEW === '1' ? 'production preview' : 'development'
  console.log(`Browser ${environment} load: initial UI ${initialLoadMs} ms; Phaser resources: ${JSON.stringify(resources)}`)
})

test('destroys the hospital Phaser scene when navigating away', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.locator('.nav-item').filter({ hasText: 'Mi hospital' }).click({ force: true })
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.locator('.nav-item').filter({ hasText: 'Inicio' }).click({ force: true })
  await expect(page.locator('canvas')).toHaveCount(0)
})
