export const APP_RELEASE_TYPE_VALIDATIONS = {
  maxLength: {
    rule: 100,
    errorMessage: `release-type length must be 100 characters or less`
  },
  matchRegexp: {
    rule: /^$|^[A-Z0-9][a-z0-9]*$/,
    errorMessage: `release-type must be a single word starting with a capital letter or number, followed by lowercase`
  }
};
