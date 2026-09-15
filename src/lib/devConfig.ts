export const DEV_CONFIG: { simulateError: boolean; delayMs: number | null } = {
  simulateError: false,
  delayMs: null,
};

export function setDevConfig(config: Partial<typeof DEV_CONFIG>) {
  Object.assign(DEV_CONFIG, config);
}