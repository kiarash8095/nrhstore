import { PHASE_PRODUCTION_BUILD } from 'next/constants';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateBuildEnvironment, validateRuntimeEnvironment } = await import('./lib/server/runtime-config.cjs');
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) validateBuildEnvironment();
    else validateRuntimeEnvironment();
  }
}
