package com.mattia.nuotoparalimpico.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

// ============================================================================
// STITCH FINPCOACH DESIGN SYSTEM - THEME & SHAPES
// ============================================================================

private val StitchLightColorScheme = lightColorScheme(
    primary = StitchPrimaryLight,
    onPrimary = StitchOnPrimaryLight,
    primaryContainer = StitchPrimaryContainerLight,
    onPrimaryContainer = StitchOnPrimaryContainerLight,
    secondary = StitchSecondaryLight,
    onSecondary = StitchOnSecondaryLight,
    secondaryContainer = StitchSecondaryContainerLight,
    onSecondaryContainer = StitchOnSecondaryContainerLight,
    tertiary = StitchTertiaryLight,
    onTertiary = StitchOnTertiaryLight,
    tertiaryContainer = StitchTertiaryContainerLight,
    onTertiaryContainer = StitchOnTertiaryContainerLight,
    background = StitchBackgroundLight,
    onBackground = StitchOnBackgroundLight,
    surface = StitchSurfaceLight,
    onSurface = StitchOnSurfaceLight,
    surfaceVariant = StitchSurfaceVariantLight,
    onSurfaceVariant = StitchOnSurfaceVariantLight,
    outline = StitchOutlineLight,
    error = StitchError,
    onError = StitchOnError
)

private val StitchDarkColorScheme = darkColorScheme(
    primary = StitchPrimaryDark,
    onPrimary = StitchOnPrimaryDark,
    primaryContainer = StitchPrimaryContainerDark,
    onPrimaryContainer = StitchOnPrimaryContainerDark,
    secondary = StitchSecondaryDark,
    onSecondary = StitchOnSecondaryDark,
    secondaryContainer = StitchSecondaryContainerDark,
    onSecondaryContainer = StitchSecondaryContainerDark,
    tertiary = StitchTertiaryDark,
    onTertiary = StitchOnTertiaryDark,
    tertiaryContainer = StitchTertiaryContainerDark,
    onTertiaryContainer = StitchOnTertiaryContainerDark,
    background = StitchBackgroundDark,
    onBackground = StitchOnBackgroundDark,
    surface = StitchSurfaceDark,
    onSurface = StitchOnSurfaceDark,
    surfaceVariant = StitchSurfaceVariantDark,
    onSurfaceVariant = StitchOnSurfaceVariantDark,
    outline = StitchOutlineDark,
    error = StitchError,
    onError = StitchOnError
)

// Standardized Rounded Corners for Stitch FinpCoach components
val StitchShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

@Composable
fun NuotoParalimpicoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> StitchDarkColorScheme
        else -> StitchLightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = StitchTypography,
        shapes = StitchShapes,
        content = content
    )
}
