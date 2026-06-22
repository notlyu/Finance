// T4.2 — фиче-флаг spaceUxV2 (откат новой механики пространств).
describe('config/flags', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function loadFlags() {
    let flags;
    jest.isolateModules(() => { flags = require('./flags').flags; });
    return flags;
  }

  it('spaceUxV2 defaults to true when env is unset', () => {
    delete process.env.REACT_APP_SPACE_UX_V2;
    expect(loadFlags().spaceUxV2).toBe(true);
  });

  it('REACT_APP_SPACE_UX_V2="false" disables it (откат)', () => {
    process.env.REACT_APP_SPACE_UX_V2 = 'false';
    expect(loadFlags().spaceUxV2).toBe(false);
  });

  it('REACT_APP_SPACE_UX_V2="0" disables it', () => {
    process.env.REACT_APP_SPACE_UX_V2 = '0';
    expect(loadFlags().spaceUxV2).toBe(false);
  });

  it('REACT_APP_SPACE_UX_V2="true" enables it', () => {
    process.env.REACT_APP_SPACE_UX_V2 = 'true';
    expect(loadFlags().spaceUxV2).toBe(true);
  });

  it('empty string falls back to default (true)', () => {
    process.env.REACT_APP_SPACE_UX_V2 = '';
    expect(loadFlags().spaceUxV2).toBe(true);
  });
});
