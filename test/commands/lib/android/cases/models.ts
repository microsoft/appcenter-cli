import { IBuildGradle } from "../../../../../src/commands/lib/android/models/build-gradle";

export interface IBuildGradleCase extends ICase {
  content: string;
  expectedResult: IBuildGradle;
}

interface ICase {
  name: string;
}
