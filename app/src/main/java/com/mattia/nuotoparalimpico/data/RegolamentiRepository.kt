package com.mattia.nuotoparalimpico.data

import android.content.Context
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLDecoder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

enum class FonteRegolamento(val etichetta: String) {
    FINP("FINP · Italia"),
    WPS("World Para Swimming")
}

data class DocumentoRegolamento(
    val fonte: FonteRegolamento,
    val sezione: String,
    val titolo: String,
    val url: String,
    val nota: String,
    /** true = è il regolamento tecnico principale in vigore trovato sulla pagina ufficiale. */
    val principale: Boolean
)

data class StatoRegolamenti(
    val documenti: List<DocumentoRegolamento> = emptyList(),
    val caricamento: Boolean = false,
    val errore: String? = null,
    val aggiornatoIl: Long? = null
)

data class EsitoScaricamento(
    val documenti: List<DocumentoRegolamento>,
    val errori: List<String>,
    val timestamp: Long
)

/**
 * Scarica le pagine pubbliche dei regolamenti ed estrae i link ai PDF.
 * Nessun dato degli atleti viene inviato: solo richieste GET.
 */
class RegolamentiRepository(context: Context) {

    companion object {
        const val LINK_RANKING_MONDO = "https://www.ipc-services.org/sdms/web/rankings/swm"
        const val LINK_RECORD_MONDO = "https://www.paralympic.org/swimming/records"
        const val LINK_RISULTATI_ITALIA = "https://www.finp.it/risultati-nazionali"
        const val LINK_RECORD_ITALIA = "https://www.finp.it/record-italiani"
        const val LINK_TABELLA_PUNTI = "https://www.finp.it/tabella-punti"
        const val LINK_FINP_TECNICO = "https://www.finp.it/tecnico"
        const val LINK_WPS_RULES = "https://www.paralympic.org/swimming/rules"
    }

    private class Pagina(val fonte: FonteRegolamento, val sezione: String, val url: String)

    private val pagine = listOf(
        Pagina(FonteRegolamento.FINP, "Regolamenti tecnici", "https://www.finp.it/tecnico"),
        Pagina(FonteRegolamento.FINP, "Classificazioni", "https://www.finp.it/classificazioni-2"),
        Pagina(FonteRegolamento.FINP, "Internazionale", "https://www.finp.it/internazionale-1"),
        Pagina(FonteRegolamento.FINP, "Tabella punti", "https://www.finp.it/tabella-punti"),
        Pagina(FonteRegolamento.FINP, "Record italiani", "https://www.finp.it/record-italiani"),
        Pagina(FonteRegolamento.WPS, "Regole e regolamenti", "https://www.paralympic.org/swimming/rules")
    )

    private val prefs = context.applicationContext.getSharedPreferences("regolamenti", Context.MODE_PRIVATE)

    private val reLinkPdf = Regex(
        """<a\s[^>]*?href\s*=\s*["']([^"']+?\.pdf)["'][^>]*>(.*?)</a>""",
        setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)
    )

    // ---------------- cache ----------------

    fun leggiCache(): Pair<List<DocumentoRegolamento>, Long?> {
        val ts = prefs.getLong("ts", 0L).takeIf { it > 0L }
        val docs = prefs.getString("docs", "").orEmpty().lines()
            .filter { it.isNotBlank() }
            .mapNotNull { riga ->
                val c = riga.split("\t")
                if (c.size < 6) null
                else runCatching {
                    DocumentoRegolamento(FonteRegolamento.valueOf(c[0]), c[1], c[2], c[3], c[4], c[5] == "1")
                }.getOrNull()
            }
        return docs to ts
    }

    private fun salvaCache(docs: List<DocumentoRegolamento>, ts: Long) {
        fun p(s: String) = s.replace('\t', ' ').replace('\n', ' ')
        val testo = docs.joinToString("\n") {
            listOf(it.fonte.name, p(it.sezione), p(it.titolo), p(it.url), p(it.nota), if (it.principale) "1" else "0")
                .joinToString("\t")
        }
        prefs.edit().putString("docs", testo).putLong("ts", ts).apply()
    }

    // ---------------- download ----------------

    suspend fun scarica(): EsitoScaricamento = withContext(Dispatchers.IO) {
        val documenti = mutableListOf<DocumentoRegolamento>()
        val errori = mutableListOf<String>()
        for (p in pagine) {
            try {
                val html = leggiPagina(p.url)
                documenti += estrai(html, p)
            } catch (e: Exception) {
                errori += "${p.url}: ${e.message ?: e.javaClass.simpleName}"
            }
        }
        val unici = documenti.distinctBy { it.url }.toMutableList()
        segnaPrincipale(unici, FonteRegolamento.FINP) { it.url.contains("regolamento-tecnico-nuoto", true) || it.titolo.contains("Regolamento Tecnico Nuoto", true) }
        segnaPrincipale(unici, FonteRegolamento.WPS) { it.titolo.contains("Rules and Regulations", true) && !it.titolo.contains("Summary", true) }
        val ts = System.currentTimeMillis()
        if (unici.isNotEmpty()) salvaCache(unici, ts)
        EsitoScaricamento(unici, errori, ts)
    }

    private fun segnaPrincipale(
        lista: MutableList<DocumentoRegolamento>,
        fonte: FonteRegolamento,
        criterio: (DocumentoRegolamento) -> Boolean
    ) {
        val idx = lista.indexOfFirst { it.fonte == fonte && criterio(it) }
        if (idx >= 0) lista[idx] = lista[idx].copy(principale = true)
    }

    private fun leggiPagina(url: String): String {
        val c = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 10_000
            readTimeout = 15_000
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "FINPcoach/1.0 (Android)")
        }
        try {
            if (c.responseCode !in 200..299) error("HTTP ${c.responseCode}")
            return c.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        } finally {
            c.disconnect()
        }
    }

    // ---------------- parsing ----------------

    private fun estrai(html: String, p: Pagina): List<DocumentoRegolamento> {
        val risultati = mutableListOf<DocumentoRegolamento>()
        var precedente = 0
        for (m in reLinkPdf.findAll(html)) {
            val url = risolvi(p.url, m.groupValues[1])
            var blocco = html.substring(precedente, m.range.first).takeLast(1500)
            val maggiore = blocco.indexOf('>')
            val minore = blocco.indexOf('<')
            if (maggiore >= 0 && (minore < 0 || maggiore < minore)) blocco = blocco.substring(maggiore + 1)
            precedente = m.range.last + 1

            val righe = testoPulito(blocco).lines().map { it.trim() }.filter { it.isNotEmpty() }
            val nota = righe.lastOrNull { it.startsWith("Appr", true) || it.contains("C.F.", true) } ?: ""
            val testoLink = testoPulito(m.groupValues[2]).replace('\n', ' ').trim()
            val linkGenerico = testoLink.isBlank() || listOf("scarica", "download", "clicca", "leggi", "here")
                .any { testoLink.contains(it, true) }

            val titolo = when {
                p.fonte == FonteRegolamento.WPS && !linkGenerico -> testoLink
                nota.isNotEmpty() -> righe.lastOrNull { it != nota && it.length <= 140 } ?: umanizza(url)
                !linkGenerico -> testoLink
                else -> righe.lastOrNull { it.length <= 120 } ?: umanizza(url)
            }
            risultati += DocumentoRegolamento(p.fonte, p.sezione, titolo.take(160), url, nota, false)
        }
        return risultati
    }

    private fun risolvi(base: String, href: String): String =
        runCatching { URL(URL(base), href.trim()).toString() }.getOrDefault(href.trim()).replace(" ", "%20")

    private fun umanizza(url: String): String {
        val nome = url.substringAfterLast('/').substringBeforeLast('.')
        val dec = runCatching { URLDecoder.decode(nome, "UTF-8") }.getOrDefault(nome)
        return dec.replace('-', ' ').replace('_', ' ').trim()
    }

    private fun testoPulito(html: String): String =
        html.replace(Regex("(?is)<(script|style)[^>]*>.*?</\\1>"), " ")
            .replace(Regex("(?i)<br\\s*/?>|</(p|div|li|h[1-6]|tr|td|span)>"), "\n")
            .replace(Regex("<[^>]*>"), " ")
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&quot;", "\"")
            .replace("&#8217;", "'")
            .replace("&rsquo;", "'")
            .lines().joinToString("\n") { it.trim() }
}