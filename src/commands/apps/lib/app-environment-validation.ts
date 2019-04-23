export const APP_ENVIRONMENT_VALIDATIONS = {
  maxLength: {
    rule: 100,
    errorMessage: `environment-app length must be 100 characters or less`
  },
  matchRegexp: {
    rule: /^$|^[A-Z0-9][a-z0-9]*$/,
    errorMessage: `environment-app must be a single word starting with a capital letter or number, followed by lowercase`
  }
};
