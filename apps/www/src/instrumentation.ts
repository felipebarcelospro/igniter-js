export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node').then((mod) => mod.register())
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./instrumentation.edge').then((mod) => mod.register())
  }
}
