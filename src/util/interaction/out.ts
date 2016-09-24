// Functions to support outputting stuff to the user

// TODO: Support format setting, debug flag

const Spinner = require("cli-spinner").Spinner;

// Display a progress spinner while waiting for the provided promise
// to complete.
export function progress<T>(title: string, action: Promise<T>): Promise<T> {
  const spinner = new Spinner(title);
  spinner.start();
  return action.then(result => {
    spinner.stop(true);
    return result;
  })
  .catch(ex => {
    spinner.stop(true);
    throw ex;
  });
}
