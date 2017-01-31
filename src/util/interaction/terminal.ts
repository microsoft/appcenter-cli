//
// Utilities to deal with the terminal and formatting
//

export namespace terminal {
  export function columns(): number {
    const stdout: any = process.stdout; // Need to cast to any to get access to the TTY functions
    if (stdout.isTTY) {
      return stdout.columns;
    }

    // Not interactive, default to 80 columns arbitrarily.
    return  80;
  }

  // Is this an interactive session or not?
  export function isInteractive(): boolean {
    const stdout: any = process.stdout; // Need to cast to any to get access to the TTY functions
    const stdin: any = process.stdin;
    return !!stdin.isTTY && !!stdout.isTTY;
  }
}
