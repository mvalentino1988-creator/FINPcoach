// Root build file
tasks.register("assembleDebug") {
    dependsOn(":app:assembleDebug")
}
