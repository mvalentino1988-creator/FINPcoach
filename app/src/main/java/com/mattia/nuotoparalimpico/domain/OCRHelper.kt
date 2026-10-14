package com.mattia.nuotoparalimpico.domain

import android.content.Context
import android.net.Uri
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Helper per OCR (Optical Character Recognition) usando ML Kit.
 * Estrae testo da immagini per interpretare tempi di gara o allenamenti.
 */
object OCRHelper {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    /**
     * Converte un Task ML Kit in una coroutine suspend
     */
    private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { continuation ->
        addOnSuccessListener { result ->
            continuation.resume(result)
        }
        addOnFailureListener { exception ->
            continuation.resumeWithException(exception)
        }
    }

    /**
     * Estrae testo da un'immagine (Uri).
     * Ritorna il testo estratto o null in caso di errore.
     */
    suspend fun estraiTestoDaImmagine(context: Context, imageUri: Uri): String? {
        return try {
            val image = InputImage.fromFilePath(context, imageUri)
            val result: Text = withContext(Dispatchers.IO) {
                recognizer.process(image).await()
            }
            result.text
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Estrae testo da un'immagine e lo passa al parser NLP.
     * Ritorna un RisultatoParsing con i dati estratti.
     */
    suspend fun parseTempoDaImmagine(context: Context, imageUri: Uri): RisultatoParsing {
        val testo = estraiTestoDaImmagine(context, imageUri)
        return if (testo != null && testo.isNotBlank()) {
            NLPParser.parseTempo(testo)
        } else {
            RisultatoParsing(
                successo = false,
                messaggio = "Non è stato possibile estrarre testo dall'immagine. Prova a fare una foto più chiara."
            )
        }
    }

    /**
     * Estrae testo da un'immagine e lo passa al parser NLP per sedute.
     * Ritorna un RisultatoParsing con i dati estratti.
     */
    suspend fun parseSedutaDaImmagine(context: Context, imageUri: Uri): RisultatoParsing {
        val testo = estraiTestoDaImmagine(context, imageUri)
        return if (testo != null && testo.isNotBlank()) {
            NLPParser.parseSeduta(testo)
        } else {
            RisultatoParsing(
                successo = false,
                messaggio = "Non è stato possibile estrarre testo dall'immagine. Prova a fare una foto più chiara."
            )
        }
    }
}
