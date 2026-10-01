package com.mattia.nuotoparalimpico.data

import android.content.Context
import android.content.SharedPreferences
import java.time.DayOfWeek

/** Valori null = automatico. */
data class ImpostazioniPiano(
    val giorni: Set<DayOfWeek>? = null,
    val metriBaseSeduta: Int? = null,
    val numeroMacrocicli: Int? = null,
    val settimaneCicloCarico: Int? = null
)

class ImpostazioniStore(context: Context) {
    private val prefs = context.applicationContext
        .getSharedPreferences("finpcoach_impostazioni", Context.MODE_PRIVATE)

    private fun intOrNull(k: String): Int? = if (prefs.contains(k)) prefs.getInt(k, 0) else null

    private fun SharedPreferences.Editor.putOrRemove(k: String, v: Int?) {
        if (v == null) remove(k) else putInt(k, v)
    }

    fun leggi(): ImpostazioniPiano = ImpostazioniPiano(
        giorni = prefs.getString("giorni", null)
            ?.split(",")
            ?.mapNotNull { runCatching { DayOfWeek.valueOf(it) }.getOrNull() }
            ?.toSet()
            ?.takeIf { it.isNotEmpty() },
        metriBaseSeduta = intOrNull("metri"),
        numeroMacrocicli = intOrNull("macro"),
        settimaneCicloCarico = intOrNull("ciclo")
    )

    fun salva(i: ImpostazioniPiano) {
        prefs.edit().apply {
            val g = i.giorni
            if (g.isNullOrEmpty()) remove("giorni") else putString("giorni", g.joinToString(",") { it.name })
            putOrRemove("metri", i.metriBaseSeduta)
            putOrRemove("macro", i.numeroMacrocicli)
            putOrRemove("ciclo", i.settimaneCicloCarico)
        }.apply()
    }

    fun ultimaFirmaPiano(): Int? = if (prefs.contains("firma_piano")) prefs.getInt("firma_piano", 0) else null
    fun salvaFirmaPiano(f: Int) { prefs.edit().putInt("firma_piano", f).apply() }

    fun classiGiaStimate(atletaId: Long): Boolean =
        prefs.getStringSet("classi_stimate", emptySet())?.contains(atletaId.toString()) == true

    fun segnaClassiStimate(atletaId: Long) {
        val s = (prefs.getStringSet("classi_stimate", emptySet()) ?: emptySet()).toMutableSet()
        s.add(atletaId.toString())
        prefs.edit().putStringSet("classi_stimate", s).apply()
    }
}