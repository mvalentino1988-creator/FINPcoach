package com.mattia.nuotoparalimpico.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val CustomLightColorScheme = lightColorScheme(
    primary = PrimaryTeal,
    onPrimary = OnPrimaryTeal,
    primaryContainer = PrimaryContainerTeal,
    onPrimaryContainer = OnPrimaryContainerTeal,
    secondary = SecondaryBlue,
    secondaryContainer = SecondaryContainerBlue,
    onSecondaryContainer = OnSecondaryContainerBlue,
    tertiary = TertiaryCoral,
    tertiaryContainer = TertiaryContainerCoral,
    onTertiaryContainer = OnTertiaryContainerCoral,
    surface = SurfaceLight,
    surfaceVariant = SurfaceVariantLight
)

private val CustomDarkColorScheme = darkColorScheme(
    primary = PrimaryTealDark,
    primaryContainer = PrimaryContainerTealDark,
    secondary = SecondaryBlueDark,
    secondaryContainer = SecondaryContainerBlueDark,
    surface = SurfaceDark,
    surfaceVariant = SurfaceVariantDark
)

@Composable
fun NuotoParalimpicoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colori = if (darkTheme) CustomDarkColorScheme else CustomLightColorScheme
    MaterialTheme(colorScheme = colori, typography = Typography, content = content)
}
