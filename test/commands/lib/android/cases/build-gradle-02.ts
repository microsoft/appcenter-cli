import { IBuildGradle } from "./../../../../../src/commands/lib/android/models/build-gradle";
import { IBuildGradleCase } from "./models";

const name = "case #02";

const content = `
apply plugin: 'com.android.application'

android {
    compileSdkVersion 25
    buildToolsVersion "25.0.2"
    defaultConfig {
        applicationId "com.example.foreverest.helloandroid"
        minSdkVersion 15
        targetSdkVersion 25
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "android.support.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    compile fileTree(dir: 'libs', include: ['*.jar'])
    androidTestCompile('com.android.support.test.espresso:espresso-core:2.2.2', {
        exclude group: 'com.android.support', module: 'support-annotations'
    })
    compile 'com.android.support:appcompat-v7:25.3.1'
    compile 'com.android.support.constraint:constraint-layout:1.0.2'
    testCompile 'junit:junit:4.12'

    def mobileCenterSdkVersion = '0.6.1'
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-push:\${mobileCenterSdkVersion}"
}
`;

const expectedResult: IBuildGradle = {
  path: null,
  contents: null,
  buildVariants: [{ 
    name: "debug", 
    buildType: "debug"
  }, {
    name: "release",
    buildType: "release"
  }],
  sourceSets: [],
  dependenciesBlocks: [{
    position: 573,
    text: `
    compile fileTree(dir: 'libs', include: ['*.jar'])
    androidTestCompile('com.android.support.test.espresso:espresso-core:2.2.2', {
        exclude group: 'com.android.support', module: 'support-annotations'
    })
    compile 'com.android.support:appcompat-v7:25.3.1'
    compile 'com.android.support.constraint:constraint-layout:1.0.2'
    testCompile 'junit:junit:4.12'

    def mobileCenterSdkVersion = '0.6.1'
    compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"
    compile "com.microsoft.azure.mobile:mobile-center-push:\${mobileCenterSdkVersion}"
`,
    defs: [{
      position: 383,
      text: "def mobileCenterSdkVersion = '0.6.1'",
      name: "mobileCenterSdkVersion",
      value: "0.6.1"
    }],
    compiles: [{
      position: 424,
      text: 'compile "com.microsoft.azure.mobile:mobile-center-analytics:\${mobileCenterSdkVersion}"',
      moduleName: "analytics"
    },{
      position: 515,
      text: 'compile "com.microsoft.azure.mobile:mobile-center-crashes:\${mobileCenterSdkVersion}"',
      moduleName: "crashes"
    },{
      position: 604,
      text: 'compile "com.microsoft.azure.mobile:mobile-center-distribute:\${mobileCenterSdkVersion}"',
      moduleName: "distribute"
    },{
      position: 696,
      text: 'compile "com.microsoft.azure.mobile:mobile-center-push:\${mobileCenterSdkVersion}"',
      moduleName: "push"
    }]
  }]
}

const bgCase: IBuildGradleCase = { name, content, expectedResult };
export default bgCase;

