export function assertDestructiveSeedIsAllowed(nodeEnv = process.env.NODE_ENV): void {
  if (nodeEnv === 'production') {
    throw new Error(
      'Refusing to seed production: the demo seed deletes all existing application data.',
    );
  }
}
