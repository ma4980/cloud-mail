(() => {
  let isDark = false
  try {
    const uiStore = JSON.parse(localStorage.getItem('ui') || '{}')
    isDark = Boolean(uiStore.dark)
  } catch {
    localStorage.removeItem('ui')
  }

  document.documentElement.classList.toggle('dark', isDark)
  const isMobile = !window.matchMedia('(pointer: fine) and (hover: hover)').matches
  document.getElementById('theme-color-meta')?.setAttribute(
    'content',
    isDark ? (isMobile ? '#141414' : '#000000') : (isMobile ? '#191A23' : '#F1F1F1')
  )
})()
