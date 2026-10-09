package com.mattia.nuotoparalimpico.data

import android.content.Context
import androidx.room.Room
import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.time.LocalDate
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MigrationTest {

    @get:Rule
    val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
        emptyList(),
        FrameworkSQLiteOpenHelperFactory()
    )

    @Test
    fun migraOgniVersioneAllaCinquePreservandoAtletaTempoEGara() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        for (versione in 1..4) {
            val nomeDb = "migrazione-v$versione-${UUID.randomUUID()}"
            try {
                helper.createDatabase(nomeDb, versione).use { db ->
                    inserisciDatiCampione(db, versione)
                }

                helper.runMigrationsAndValidate(
                    nomeDb,
                    5,
                    true,
                    MIGRAZIONE_1_2,
                    MIGRAZIONE_2_3,
                    MIGRAZIONE_3_4,
                    MIGRAZIONE_4_5
                ).use { db ->
                    assertEquals("Atleta $versione", valoreTesto(db, "SELECT nome FROM atleti WHERE id = 1"))
                    assertEquals(6235, valoreIntero(db, "SELECT centesimi FROM tempi WHERE id = 1"))
                    assertEquals("Gara $versione", valoreTesto(db, "SELECT nome FROM gare WHERE id = 1"))
                }
            } finally {
                context.deleteDatabase(nomeDb)
            }
        }
    }

    @Test
    fun salvaSedutaSostituisceQuellaDelloStessoGiorno() = runBlocking {
        val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
        val db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        try {
            val atletaId = db.atletaDao().inserisci(Atleta(nome = "Ada", cognome = "Verdi"))
            val secondoAtletaId = db.atletaDao().inserisci(Atleta(nome = "Luca", cognome = "Neri"))
            val oggi = LocalDate.of(2026, 6, 1)
            val ieri = oggi.minusDays(1)

            db.registroDao().salvaSeduta(
                oggi,
                listOf(
                    LogSeduta(atletaId = atletaId, data = oggi, metriEffettivi = 2500),
                    LogSeduta(atletaId = secondoAtletaId, data = oggi, metriEffettivi = 2200),
                    LogSeduta(atletaId = atletaId, data = ieri, metriEffettivi = 2000)
                )
            )
            db.registroDao().salvaSeduta(
                oggi,
                listOf(
                    LogSeduta(atletaId = atletaId, data = oggi, metriEffettivi = 3000),
                    LogSeduta(atletaId = secondoAtletaId, data = oggi, metriEffettivi = 2800)
                )
            )

            val log = db.registroDao().leggiLog(atletaId)
            val logSecondoAtleta = db.registroDao().leggiLog(secondoAtletaId)
            assertEquals(2, log.size)
            assertEquals(3000, log.first { it.data == oggi }.metriEffettivi)
            assertEquals(2000, log.first { it.data == ieri }.metriEffettivi)
            assertEquals(1, logSecondoAtleta.size)
            assertEquals(2800, logSecondoAtleta.single().metriEffettivi)
        } finally {
            db.close()
        }
    }

    private fun inserisciDatiCampione(db: SupportSQLiteDatabase, versione: Int) {
        val colonneExtraAtleta = when {
            versione >= 4 -> ", volumeAuto"
            versione >= 3 -> ", sesso, metriMaxSeduta"
            else -> ""
        }
        val valoriExtraAtleta = when {
            versione >= 4 -> ", 1"
            versione >= 3 -> ", NULL, NULL"
            else -> ""
        }
        db.execSQL(
            "INSERT INTO atleti (" +
                "id, nome, cognome, dataNascita, classeS, classeSB, classeSM, stato, fattoreVolume, note" +
                "$colonneExtraAtleta) VALUES (1, 'Atleta $versione', 'Test', NULL, NULL, NULL, NULL, " +
                "'IN_ATTESA', 1.0, ''$valoriExtraAtleta)"
        )

        db.execSQL(
            "INSERT INTO stagioni (id, nome, inizio, fine, vascaMetri) " +
                "VALUES (1, 'Stagione', 20000, 21000, 25)"
        )
        db.execSQL(
            "INSERT INTO tempi (id, atletaId, data, stile, distanzaMetri, centesimi, contesto, vascaMetri, note) " +
                "VALUES (1, 1, 20500, 'STILE_LIBERO', 100, 6235, 'GARA', 25, '')"
        )
        val extraGara = if (versione >= 4) ", distanze" else ""
        val valoriExtraGara = if (versione >= 4) ", ''" else ""
        db.execSQL(
            "INSERT INTO gare (id, stagioneId, nome, dal, al, luogo, prioritaria$extraGara) " +
                "VALUES (1, 1, 'Gara $versione', 20500, 20501, 'Piscina', 0$valoriExtraGara)"
        )
    }

    private fun valoreTesto(db: SupportSQLiteDatabase, query: String): String =
        db.query(query).use { cursor ->
            check(cursor.moveToFirst())
            cursor.getString(0)
        }

    private fun valoreIntero(db: SupportSQLiteDatabase, query: String): Int =
        db.query(query).use { cursor ->
            check(cursor.moveToFirst())
            cursor.getInt(0)
        }
}
