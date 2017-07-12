import { IBuildGradle } from "./../../../../src/commands/lib/android/models/build-gradle";
import ejectSdkBuildGradle from "../../../../src/commands/lib/android/eject-sdk-build-gradle";
import { expect } from "chai";

describe("Eject SDK from build.gradle", function () {
 
    it("case #01", async () => {
      // Arrange
      const buildGradle: IBuildGradle = {
        path: null,
        buildVariants: [],
        sourceSets: [],
        contents: `
dependencies {
    def mobileCenterSdkVersion = '0.6.1'
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-push:\${mobileCenterSdkVersion}"
}`,
        dependenciesBlocks: [{
          position: 15,
          text: `
    def mobileCenterSdkVersion = '0.6.1'
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-push:\${mobileCenterSdkVersion}"
`,
          defs: [{
            position: 5,
            text: "def mobileCenterSdkVersion = '0.6.1'",
            name: "mobileCenterSdkVersion",
            value: "0.6.1"
          }],
          compiles: [{
            position: 46,
            text: `compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"`,
            moduleName: "analytics"
          },{
            position: 137,
            text: `compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"`,
            moduleName: "crashes"
          },{
            position: 226,
            text: `compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"`,
            moduleName: "distribute"
          },{
            position: 318,
            text: `compile "com.microsoft.azure.mobile:mobile-center-push:\${mobileCenterSdkVersion}"`,
            moduleName: "push"
          }]
        }]
      }

      // Act
      const actualResult = ejectSdkBuildGradle(buildGradle);

      // Assert
      const expectedResult = "\n";
      expect(actualResult).to.equal(expectedResult);
    });

    it("case #02", async () => {
      // Arrange
      const buildGradle: IBuildGradle = {
        path: null,
        buildVariants: [],
        sourceSets: [],
        contents: `
dependencies {
    def mobileCenterSdkVersion = '0.6.1'
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "another.dependency:1.0.0"
}`,
        dependenciesBlocks: [{
          position: 15,
          text: `
    def mobileCenterSdkVersion = '0.6.1'
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "another.dependency:1.0.0"
`,
          defs: [{
            position: 5,
            text: "def mobileCenterSdkVersion = '0.6.1'",
            name: "mobileCenterSdkVersion",
            value: "0.6.1"
          }],
          compiles: [{
            position: 46,
            text: `compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"`,
            moduleName: "analytics"
          },{
            position: 137,
            text: `compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"`,
            moduleName: "crashes"
          },{
            position: 226,
            text: `compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"`,
            moduleName: "distribute"
          }]
        }]
      }

      // Act
      const actualResult = ejectSdkBuildGradle(buildGradle);

      // Assert
      const expectedResult = `
dependencies {
    compile "another.dependency:1.0.0"
}`;
      expect(actualResult).to.be.equal(expectedResult);
    });

    it("case #03", async () => {
      // Arrange
      const buildGradle: IBuildGradle = {
        path: null,
        buildVariants: [],
        sourceSets: [],
        contents: `
dependencies {
    def mobileCenterSdkVersion = '0.6.1'
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "another.dependency:\${mobileCenterSdkVersion}"
}`,
        dependenciesBlocks: [{
          position: 15,
          text: `
    def mobileCenterSdkVersion = '0.6.1'
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "another.dependency:\${mobileCenterSdkVersion}"
`,
          defs: [{
            position: 5,
            text: "def mobileCenterSdkVersion = '0.6.1'",
            name: "mobileCenterSdkVersion",
            value: "0.6.1"
          }],
          compiles: [{
            position: 46,
            text: `compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"`,
            moduleName: "analytics"
          },{
            position: 137,
            text: `compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"`,
            moduleName: "crashes"
          },{
            position: 226,
            text: `compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"`,
            moduleName: "distribute"
          }]
        }]
      }

      // Act
      const actualResult = ejectSdkBuildGradle(buildGradle);

      // Assert
      const expectedResult = `
dependencies {
    def mobileCenterSdkVersion = '0.6.1'
    compile "another.dependency:\${mobileCenterSdkVersion}"
}`;
      expect(actualResult).to.be.equal(expectedResult);
    });

    it("case #04", async () => {
      // Arrange
      const buildGradle: IBuildGradle = {
        path: null,
        buildVariants: [],
        sourceSets: [],
        contents: `
dependencies {
    def mobileCenterSdkVersion = '0.6.1'
    def anotherDependencyVersion = "1.0.0"
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "another.dependency:\${anotherDependencyVersion}"
}`,
        dependenciesBlocks: [{
          position: 15,
          text: `
    def mobileCenterSdkVersion = '0.6.1'
    def anotherDependencyVersion = "1.0.0"
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "another.dependency:\${anotherDependencyVersion}"
`,
          defs: [{
            position: 5,
            text: "def mobileCenterSdkVersion = '0.6.1'",
            name: "mobileCenterSdkVersion",
            value: "0.6.1"
          }, {
            position: 46,
            text: 'def anotherDependencyVersion = "1.0.0"',
            name: "anotherDependencyVersion",
            value: "1.0.0"
          }],
          compiles: [{
            position: 89,
            text: `compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"`,
            moduleName: "analytics"
          },{
            position: 180,
            text: `compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"`,
            moduleName: "crashes"
          },{
            position: 269,
            text: `compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"`,
            moduleName: "distribute"
          }]
        }]
      }

      // Act
      const actualResult = ejectSdkBuildGradle(buildGradle);

      // Assert
      const expectedResult = `
dependencies {
    def anotherDependencyVersion = "1.0.0"
    compile "another.dependency:\${anotherDependencyVersion}"
}`;
      expect(actualResult).to.be.equal(expectedResult);
    });

    it("case #05 (comments)", async () => {
      // Arrange
      const buildGradle: IBuildGradle = {
        path: null,
        buildVariants: [],
        sourceSets: [],
        contents: `
dependencies { // Single-line comment #0
    def mobileCenterSdkVersion = '0.6.1'
    // Single-line comment #1
    def anotherDependencyVersion = "1.0.0"
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    /* 
      Multi-line comment #0
    */
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    /* Multi-line comment #1 */
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "another.dependency:\${anotherDependencyVersion}"
    /* Multi-line comment #2 */
    // Single-line comment #2
}`,
        dependenciesBlocks: [{
          position: 15,
          text: ` // Single-line comment #0
    def mobileCenterSdkVersion = '0.6.1'
    // Single-line comment #1
    def anotherDependencyVersion = "1.0.0"
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    /* 
      Multi-line comment #0
    */
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    /* Multi-line comment #1 */
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "another.dependency:\${anotherDependencyVersion}"
    /* Multi-line comment #2 */
    // Single-line comment #2
`,
          defs: [{
            position: 31,
            text: "def mobileCenterSdkVersion = '0.6.1'",
            name: "mobileCenterSdkVersion",
            value: "0.6.1"
          }, {
            position: 104,
            text: 'def anotherDependencyVersion = "1.0.0"',
            name: "anotherDependencyVersion",
            value: "1.0.0"
          }],
          compiles: [{
            position: 145,
            text: `compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"`,
            moduleName: "analytics"
          },{
            position: 279,
            text: `compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"`,
            moduleName: "crashes"
          },{
            position: 400,
            text: `compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"`,
            moduleName: "distribute"
          }]
        }]
      }

      // Act
      const actualResult = ejectSdkBuildGradle(buildGradle);

      // Assert
      const expectedResult = `
dependencies { // Single-line comment #0
    // Single-line comment #1
    def anotherDependencyVersion = "1.0.0"
    /* 
      Multi-line comment #0
    */
    /* Multi-line comment #1 */
    compile "another.dependency:\${anotherDependencyVersion}"
    /* Multi-line comment #2 */
    // Single-line comment #2
}`;
      expect(actualResult).to.be.equal(expectedResult);
    });
});

