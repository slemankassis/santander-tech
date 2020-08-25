/**
 * Environment variables
 */
const variables = process.env;

/**
 * env (we take the process.env variables and we add some custom shortcuts)
 */
const env = Object.assign({}, variables, {
  PRODUCTION: variables.NODE_ENV === 'production',
  DEVELOPMENT: variables.NODE_ENV === 'development',
  TEST: variables.NODE_ENV === 'test',
  SECURE: variables.NODE_ENV !== 'production' && variables.NODE_HTTPS === 'true',
  FURY: variables.PLATFORM === 'fury',
  IS_CI: !!( // Not using just `CI` to not interfere with real process.env.CI
    variables.CI_CONTEXT || // Fury Build or Fury CI scripts
    variables.BUILD_NUMBER || // Jenkins, TeamCity
    variables.CI || // Travis CI, CircleCI, Cirrus CI, Gitlab CI, Appveyor, CodeShip, dsari
    variables.CONTINUOUS_INTEGRATION || // Travis CI, Cirrus CI
    false
  ),
});

/**
 * Expose env
 */
module.exports = env;
