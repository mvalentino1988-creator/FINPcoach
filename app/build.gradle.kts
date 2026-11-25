plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

android {
    namespace = "com.mattia.nuotoparalimpico"
    compileSdk = 35
    buildToolsVersion = "36.0.0"

    sourceSets.getByName("androidTest").assets.srcDir("$projectDir/schemas")

    defaultConfig {
        applicationId = "com.mattia.nuotoparalimpico"
        minSdk = 26
        targetSdk = 35
        // Una sola fonte di verita' per la versione: package.json ("version").
        // Allineare versionName a quel valore a ogni rilascio; versionCode
        // deve essere incrementato a ogni upload sul Play Store.
        versionCode = 2
        versionName = "0.2.0"

        // false in tutte le build; solo la buildType "qa" lo imposta a true.
        buildConfigField("boolean", "IS_QA_BUILD", "false")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        // Build QA per il collaudo sul dispositivo: pacchetto separato
        // (applicationId .qa), dati sintetici, name "FINPcoach QA".
        // Convive con l'app di produzione senza toccarne i dati.
        create("qa") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".qa"
            versionNameSuffix = "-qa"
            isDebuggable = true
            buildConfigField("boolean", "IS_QA_BUILD", "true")
            // WebView.setWebContentsDebuggingEnabled e' attivo perche' isDebuggable.
            // Il nome "FINPcoach QA" arriva da app/src/qa/res/values/strings.xml.
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)

    val roomVersion = "2.8.5"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // ML Kit per OCR
    implementation("com.google.mlkit:text-recognition:16.0.1")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation("androidx.room:room-testing:$roomVersion")
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
