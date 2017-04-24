import { IBuildGradle } from "./../../../../../src/commands/lib/android/models/build-gradle";
import { IBuildGradleCase } from "./models";

const name = "case #04 (https://github.com/irccloud/android)";

const content = `
/*
 * Copyright (c) 2015 IRCCloud, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

buildscript {
    repositories {
        jcenter()
        maven { url 'https://maven.fabric.io/public' }
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:2.3.0'
        classpath 'io.fabric.tools:gradle:1.+'
    }
}
apply plugin: 'com.android.application'
if (rootProject.file('private.properties').exists()) {
    apply plugin: 'io.fabric'
}

tasks.withType(JavaCompile) {
    options.encoding = "UTF-8"
}

repositories {
    jcenter()
    maven { url 'https://maven.fabric.io/public' }
    maven { url 'https://oss.sonatype.org/content/repositories/snapshots/' }
}

def getRevision = { ->
    def stdout = new ByteArrayOutputStream()
    exec {
        commandLine 'git', 'rev-parse', '--short', 'HEAD'
        standardOutput = stdout
    }
    return stdout.toString().trim()
}

android {
    compileSdkVersion 25
    buildToolsVersion '25.0.2'
    testBuildType 'debugTest'
    useLibrary 'org.apache.http.legacy'

    defaultConfig {
        versionCode 120
        versionName "3.24"
        minSdkVersion 10
        targetSdkVersion 25
        applicationId "com.irccloud.android"
        testApplicationId "com.irccloud.android.test"
        testInstrumentationRunner "android.test.InstrumentationTestRunner"

        resConfigs "en"
        vectorDrawables.useSupportLibrary = true
    }

    signingConfigs {
        release {
            if (rootProject.file('keystore.properties').exists()) {
                def props = new Properties()
                props.load(new FileInputStream(file('keystore.properties')))

                storeFile = file(props['storeFile'])
                storePassword = props['storePassword']
                keyAlias = props['keyAlias']
                keyPassword = props['keyPassword']
            }
        }
    }

    lintOptions {
        abortOnError false
    }

    dataBinding {
        enabled = true
    }

    buildTypes {
        debug {
            buildConfigField "String", "HOST", "\"api.irccloud.com\""
            versionNameSuffix "-" + getRevision()
            buildConfigField "boolean", "ENTERPRISE", "false"
            if (rootProject.file('private.properties').exists()) {
                def props = new Properties()
                props.load(new FileInputStream(file('private.properties')))
                buildConfigField "String", "GCM_ID", "\"" + props['GCM_ID'] + "\""
                buildConfigField "String", "IMGUR_KEY", "\"" + props['IMGUR_KEY'] + "\""
                buildConfigField "String", "IMGUR_SECRET", "\"" + props['IMGUR_SECRET'] + "\""
                buildConfigField "String", "MASHAPE_KEY", "\"" + props['MASHAPE_KEY'] + "\""
                buildConfigField "String", "FB_ACCESS_TOKEN", "\"" + props['FB_ACCESS_TOKEN'] + "\""
                manifestPlaceholders = [CRASHLYTICS_KEY: props['CRASHLYTICS_KEY']]
            } else {
                buildConfigField "String", "GCM_ID", "\"\""
                buildConfigField "String", "IMGUR_KEY", "\"\""
                buildConfigField "String", "IMGUR_SECRET", "\"\""
                buildConfigField "String", "MASHAPE_KEY", "\"\""
                buildConfigField "String", "FB_ACCESS_TOKEN", "\"\""
                manifestPlaceholders = [CRASHLYTICS_KEY: ""]
            }
            buildConfigField "String[]", "SSL_FPS", "{\"54A0A7A4EE83A09B71F867581627EB242BD2398EAAA1DC7AB4CCE26E6EED8EB8\", \"E68F27E003ED788159670B6A4C6C5328F1D1FDA81CB19CC8B816F9364684233B\"}"
            resValue "string", "IMAGE_SCHEME", "irccloud-image"
            resValue "string", "IMAGE_SCHEME_SECURE", "irccloud-images"
            resValue "string", "VIDEO_SCHEME", "irccloud-video"
            resValue "string", "VIDEO_SCHEME_SECURE", "irccloud-videos"
            resValue "string", "PASTE_SCHEME", "irccloud-paste"
            resValue "string", "DISMISS_NOTIFICATION", "com.irccloud.android.DISMISS_NOTIFICATION"
            resValue "string", "ACTION_REPLY", "com.irccloud.android.ACTION_REPLY"
            resValue "string", "app_name", "IRCCloud"
            resValue "string", "IRCCLOUD_SCHEME", "irccloud"
            buildConfigField "String", "GCM_ID_IRCCLOUD", "\"\""

            minifyEnabled false
            shrinkResources false
        }

        release {
            buildConfigField "String", "HOST", "\"api.irccloud.com\""
            buildConfigField "String[]", "SSL_FPS", "{\"54A0A7A4EE83A09B71F867581627EB242BD2398EAAA1DC7AB4CCE26E6EED8EB8\", \"E68F27E003ED788159670B6A4C6C5328F1D1FDA81CB19CC8B816F9364684233B\"}"
            buildConfigField "boolean", "ENTERPRISE", "false"
            if (rootProject.file('private.properties').exists()) {
                def props = new Properties()
                props.load(new FileInputStream(file('private.properties')))
                buildConfigField "String", "GCM_ID", "\"" + props['GCM_ID'] + "\""
                buildConfigField "String", "IMGUR_KEY", "\"" + props['IMGUR_KEY'] + "\""
                buildConfigField "String", "IMGUR_SECRET", "\"" + props['IMGUR_SECRET'] + "\""
                buildConfigField "String", "MASHAPE_KEY", "\"" + props['MASHAPE_KEY'] + "\""
                buildConfigField "String", "FB_ACCESS_TOKEN", "\"" + props['FB_ACCESS_TOKEN'] + "\""
                manifestPlaceholders = [CRASHLYTICS_KEY: props['CRASHLYTICS_KEY']]
            } else {
                buildConfigField "String", "GCM_ID", "\"\""
                buildConfigField "String", "IMGUR_KEY", "\"\""
                buildConfigField "String", "IMGUR_SECRET", "\"\""
                buildConfigField "String", "MASHAPE_KEY", "\"\""
                buildConfigField "String", "FB_ACCESS_TOKEN", "\"\""
                manifestPlaceholders = [CRASHLYTICS_KEY: ""]
            }
            resValue "string", "IMAGE_SCHEME", "irccloud-image"
            resValue "string", "IMAGE_SCHEME_SECURE", "irccloud-images"
            resValue "string", "VIDEO_SCHEME", "irccloud-video"
            resValue "string", "VIDEO_SCHEME_SECURE", "irccloud-videos"
            resValue "string", "PASTE_SCHEME", "irccloud-paste"
            resValue "string", "DISMISS_NOTIFICATION", "com.irccloud.android.DISMISS_NOTIFICATION"
            resValue "string", "ACTION_REPLY", "com.irccloud.android.ACTION_REPLY"
            resValue "string", "app_name", "IRCCloud"
            resValue "string", "IRCCLOUD_SCHEME", "irccloud"
            buildConfigField "String", "GCM_ID_IRCCLOUD", "\"\""

            if (rootProject.file('keystore.properties').exists()) {
                signingConfig signingConfigs.release
            }

            minifyEnabled true
            shrinkResources false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-project.txt'
        }

        enterprisedebug {
            applicationIdSuffix ".enterprise"
            versionNameSuffix "-" + getRevision()
            buildConfigField "String", "HOST", "\"\""
            buildConfigField "boolean", "ENTERPRISE", "true"
            if (rootProject.file('enterprise.properties').exists()) {
                def props = new Properties()
                props.load(new FileInputStream(file('enterprise.properties')))
                buildConfigField "String", "GCM_ID", "\"" + props['GCM_ID'] + "\""
                buildConfigField "String", "GCM_ID_IRCCLOUD", "\"" + props['GCM_ID_IRCCLOUD'] + "\""
                buildConfigField "String", "IMGUR_KEY", "\"" + props['IMGUR_KEY'] + "\""
                buildConfigField "String", "IMGUR_SECRET", "\"" + props['IMGUR_SECRET'] + "\""
                buildConfigField "String", "MASHAPE_KEY", "\"" + props['MASHAPE_KEY'] + "\""
                buildConfigField "String", "FB_ACCESS_TOKEN", "\"" + props['FB_ACCESS_TOKEN'] + "\""
                manifestPlaceholders = [CRASHLYTICS_KEY: props['CRASHLYTICS_KEY']]
            } else {
                buildConfigField "String", "GCM_ID", "\"\""
                buildConfigField "String", "GCM_ID_IRCCLOUD", "\"\""
                buildConfigField "String", "IMGUR_KEY", "\"\""
                buildConfigField "String", "IMGUR_SECRET", "\"\""
                buildConfigField "String", "MASHAPE_KEY", "\"\""
                buildConfigField "String", "FB_ACCESS_TOKEN", "\"\""
                manifestPlaceholders = [CRASHLYTICS_KEY: ""]
            }
            buildConfigField "String[]", "SSL_FPS", "null"
            resValue "string", "IMAGE_SCHEME", "irccloud-enterprise-image"
            resValue "string", "IMAGE_SCHEME_SECURE", "irccloud-enterprise-images"
            resValue "string", "VIDEO_SCHEME", "irccloud-enterprise-video"
            resValue "string", "VIDEO_SCHEME_SECURE", "irccloud-enterprise-videos"
            resValue "string", "PASTE_SCHEME", "irccloud-enterprise-paste"
            resValue "string", "DISMISS_NOTIFICATION", "com.irccloud.android.enterprise.DISMISS_NOTIFICATION"
            resValue "string", "ACTION_REPLY", "com.irccloud.android.enterprise.ACTION_REPLY"
            resValue "string", "app_name", "IRCEnterprise"
            resValue "string", "IRCCLOUD_SCHEME", "irccloud-enterprise"

            signingConfig signingConfigs.debug
            minifyEnabled false
            shrinkResources false
            debuggable true
        }

        enterpriserelease {
            applicationIdSuffix ".enterprise"
            buildConfigField "String", "HOST", "\"\""
            buildConfigField "boolean", "ENTERPRISE", "true"
            if (rootProject.file('enterprise.properties').exists()) {
                def props = new Properties()
                props.load(new FileInputStream(file('enterprise.properties')))
                buildConfigField "String", "GCM_ID", "\"" + props['GCM_ID'] + "\""
                buildConfigField "String", "GCM_ID_IRCCLOUD", "\"" + props['GCM_ID_IRCCLOUD'] + "\""
                buildConfigField "String", "IMGUR_KEY", "\"" + props['IMGUR_KEY'] + "\""
                buildConfigField "String", "IMGUR_SECRET", "\"" + props['IMGUR_SECRET'] + "\""
                buildConfigField "String", "MASHAPE_KEY", "\"" + props['MASHAPE_KEY'] + "\""
                buildConfigField "String", "FB_ACCESS_TOKEN", "\"" + props['FB_ACCESS_TOKEN'] + "\""
                manifestPlaceholders = [CRASHLYTICS_KEY: props['CRASHLYTICS_KEY']]
            } else {
                buildConfigField "String", "GCM_ID", "\"\""
                buildConfigField "String", "GCM_ID_IRCCLOUD", "\"\""
                buildConfigField "String", "IMGUR_KEY", "\"\""
                buildConfigField "String", "IMGUR_SECRET", "\"\""
                buildConfigField "String", "MASHAPE_KEY", "\"\""
                buildConfigField "String", "FB_ACCESS_TOKEN", "\"\""
                manifestPlaceholders = [CRASHLYTICS_KEY: ""]
            }
            buildConfigField "String[]", "SSL_FPS", "null"
            resValue "string", "IMAGE_SCHEME", "irccloud-enterprise-image"
            resValue "string", "IMAGE_SCHEME_SECURE", "irccloud-enterprise-images"
            resValue "string", "VIDEO_SCHEME", "irccloud-enterprise-video"
            resValue "string", "VIDEO_SCHEME_SECURE", "irccloud-enterprise-videos"
            resValue "string", "PASTE_SCHEME", "irccloud-enterprise-paste"
            resValue "string", "DISMISS_NOTIFICATION", "com.irccloud.android.enterprise.DISMISS_NOTIFICATION"
            resValue "string", "ACTION_REPLY", "com.irccloud.android.enterprise.ACTION_REPLY"
            resValue "string", "app_name", "IRCEnterprise"
            resValue "string", "IRCCLOUD_SCHEME", "irccloud-enterprise"

            if (rootProject.file('keystore.properties').exists()) {
                signingConfig signingConfigs.release
            }
            minifyEnabled true
            shrinkResources false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-project.txt'
        }

        debugTest.initWith(debug)
        debugTest {
            minifyEnabled false
            shrinkResources false
        }
    }

    sourceSets {
        main.manifest.srcFile 'AndroidManifest.xml'
        main.java.srcDirs = ['src']
        main.resources.srcDirs = ['src']
        main.aidl.srcDirs = ['src']
        main.renderscript.srcDirs = ['src']
        enterprisedebug.res.srcDirs = ['enterprise-res', 'themes']
        enterpriserelease.res.srcDirs = ['enterprise-res', 'themes']
        main.res.srcDirs = ['res', 'themes']
        main.assets.srcDirs = ['assets']
        debug.java.srcDirs = ['release-src']
        enterprisedebug.java.srcDirs = ['debug-src']
        release.java.srcDirs = ['release-src']
        enterpriserelease.java.srcDirs = ['release-src']
        debugTest.java.srcDirs = ['release-src']

        androidTest {
            manifest.srcFile 'tests/AndroidManifest.xml'
            java.srcDirs = ['tests/src']
            res.srcDirs = ['tests/res']
            assets.srcDirs = ['tests/assets']
            resources.srcDirs = ['tests/src']
        }
    }

    packagingOptions {
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/ASL-2.0.txt'
        exclude 'META-INF/LGPL-3.0.txt'
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_7
        targetCompatibility JavaVersion.VERSION_1_7
    }
}

task __filteredResources(type: Copy) {
    from('res/') {
        exclude 'drawable-mdpi/ic_launcher.png'
        exclude 'drawable-hdpi/ic_launcher.png'
        exclude 'drawable-xhdpi/ic_launcher.png'
        exclude 'drawable-xxhdpi/ic_launcher.png'
        exclude 'drawable-xxxhdpi/ic_launcher.png'
        exclude 'drawable-mdpi/login_logo.png'
        exclude 'drawable-hdpi/login_logo.png'
        exclude 'drawable-xhdpi/login_logo.png'
        exclude 'drawable-xxhdpi/login_logo.png'
        exclude 'drawable-xxxhdpi/login_logo.png'
        exclude 'drawable/notification_icon_bg.xml'
    }
    into 'build/filtered_resources'
    includeEmptyDirs = true
}

tasks.whenTaskAdded { task ->
    if (task.name == 'mergeEnterprisedebugResources' || task.name == 'mergeEnterprisereleaseResources') {
        task.dependsOn __filteredResources
    }
}

dependencies {
    compile 'com.android.support:support-v4:25.2.0'
    compile 'com.android.support:support-v13:25.2.0'
    compile 'com.android.support:appcompat-v7:25.2.0'
    compile 'com.android.support:cardview-v7:25.2.0'
    compile 'com.android.support:design:25.2.0'
    compile 'com.android.support:recyclerview-v7:25.2.0'
    compile 'com.android.support:customtabs:25.2.0'
// Play Services 10.2 and newer doesn't support Gingerbread or Honeycomb
    compile 'com.google.android.gms:play-services-base:10.0.1'
    compile 'com.google.android.gms:play-services-auth:10.0.1'
    compile 'com.google.android.gms:play-services-identity:10.0.1'
    compile 'com.google.android.gms:play-services-ads:10.0.1'
    compile 'com.google.android.gms:play-services-gcm:10.0.1'
    compile 'com.google.android.apps.dashclock:dashclock-api:+'
    compile 'com.vandalsoftware.android:dslv:+'
    compile 'com.infstory:switch-preference-compat:1.0.+'
    compile 'com.damnhandy:handy-uri-templates:2.0.2'
    compile project(':android-websockets')
    compile 'com.fasterxml.jackson.core:jackson-databind:2.8.6'
    annotationProcessor 'com.raizlabs.android:DBFlow-Compiler:2.2.1'
    compile 'com.raizlabs.android:DBFlow-Core:2.2.1'
    compile 'com.raizlabs.android:DBFlow:2.2.1'
    compile 'org.solovyev.android.views:linear-layout-manager:0.5@aar'
    compile 'com.datatheorem.android.trustkit:trustkit:1.0.0'
    compile('com.crashlytics.sdk.android:crashlytics:2.6.7@aar') {
        transitive = true;
    }
    compile fileTree(include: ['*.jar'], dir: 'libs')
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
  }, {
    name: "enterprisedebug",
    buildType: "enterprisedebug"
  }, {
    name: "enterpriserelease",
    buildType: "enterpriserelease"
  }, {
    name: "debugTest",
    buildType: "debugTest"
  }],
  sourceSets: [{
    name: "main",
    manifestSrcFile: "'AndroidManifest.xml'",
    javaSrcDirs: ["'src'"]
  }, {
    name: "enterprisedebug",
    javaSrcDirs: ["'debug-src'"]
  }, {
    name: "enterpriserelease",
    javaSrcDirs: ["'release-src'"]
  }, {
    name: "debug",
    javaSrcDirs: ["'release-src'"]
  }, {
    name: "release",
    javaSrcDirs: ["'release-src'"]
  }, {
    name: "debugTest",
    javaSrcDirs: ["'release-src'"]
  }, {
    name: "androidTest",
    manifestSrcFile: "'tests/AndroidManifest.xml'",
    javaSrcDirs: ["'tests/src'"]
  }],
  dependenciesBlocks: []
}

const bgCase: IBuildGradleCase = { name, content, expectedResult };
export default bgCase;

