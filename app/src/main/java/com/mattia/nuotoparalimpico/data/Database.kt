package com.mattia.nuotoparalimpico.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import java.time.LocalDate

class Converters {
    @TypeConverter
    fun daLong(valore: Long?): LocalDate? = valore?.let { LocalDate.ofEpochDay(it) }

    @TypeConverter
    fun aLong(data: LocalDate?): Long? = data?.toEpochDay()
}

/** v2: microcicli modificabili a mano (colonna "bloccato"). I dati esistenti restano. */
val MIGRAZIONE_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE microcicli ADD COLUMN bloccato INTEGER NOT NULL DEFAULT 0")
    }
}

/** v3: la stagione ricorda i giorni di allenamento (bitmask, 36 = mercoledì + sabato). */
val MIGRAZIONE_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE stagioni ADD COLUMN giorniAllenamento INTEGER NOT NULL DEFAULT 36")
    }
}

/** v4: aggiunge la tabella del ranking atleta. */
val MIGRAZIONE_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS ranking_atleta (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                "atletaId INTEGER NOT NULL, " +
                "stile TEXT NOT NULL, " +
                "distanzaMetri INTEGER NOT NULL, " +
                "ambito TEXT NOT NULL, " +
                "posizione INTEGER NOT NULL, " +
                "aggiornatoIl INTEGER NOT NULL, " +
                "FOREIGN KEY(atletaId) REFERENCES atleti(id) ON DELETE CASCADE)"
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS index_ranking_atleta_atletaId ON ranking_atleta(atletaId)")
    }
}

/** v5: allinea le tabelle al modello attuale preservando i dati ancora rappresentati. */
val MIGRAZIONE_4_5 = object : Migration(4, 5) {
    override fun migrate(db: SupportSQLiteDatabase) {
        fun colonnaEsistente(tabella: String, colonna: String): Boolean {
            val esiste = db.query("PRAGMA table_info($tabella)").use { cursor ->
                val indiceNome = cursor.getColumnIndexOrThrow("name")
                var trovata = false
                while (cursor.moveToNext()) {
                    if (cursor.getString(indiceNome) == colonna) {
                        trovata = true
                        break
                    }
                }
                trovata
            }
            return esiste
        }

        fun aggiungiColonnaSeAssente(tabella: String, colonna: String, definizione: String) {
            if (!colonnaEsistente(tabella, colonna)) {
                db.execSQL("ALTER TABLE $tabella ADD COLUMN $colonna $definizione")
            }
        }

        aggiungiColonnaSeAssente("atleti", "sesso", "TEXT")
        aggiungiColonnaSeAssente("atleti", "metriMaxSeduta", "INTEGER")
        aggiungiColonnaSeAssente("stagioni", "giorniAllenamento", "INTEGER NOT NULL DEFAULT 36")

        if (!colonnaEsistente("atleti", "volumeAuto")) {
            val sesso = if (colonnaEsistente("atleti", "sesso")) "sesso" else "NULL"
            val metriMax = if (colonnaEsistente("atleti", "metriMaxSeduta")) "metriMaxSeduta" else "NULL"
            val figli = listOf(
                "condizioni_mediche",
                "assenze",
                "atleta_attributi",
                "tempi",
                "log_sedute",
                "ranking_atleta"
            )
            figli.forEach { tabella ->
                db.execSQL("CREATE TEMP TABLE ${tabella}_backup AS SELECT * FROM $tabella")
                db.execSQL("DROP TABLE $tabella")
            }

            db.execSQL(
                "CREATE TABLE atleti_v5 (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "nome TEXT NOT NULL, " +
                    "cognome TEXT NOT NULL, " +
                    "dataNascita INTEGER, " +
                    "classeS INTEGER, " +
                    "classeSB INTEGER, " +
                    "classeSM INTEGER, " +
                    "stato TEXT NOT NULL, " +
                    "fattoreVolume REAL NOT NULL, " +
                    "volumeAuto INTEGER NOT NULL, " +
                    "note TEXT NOT NULL, " +
                    "sesso TEXT, " +
                    "metriMaxSeduta INTEGER)"
            )
            db.execSQL(
                "INSERT INTO atleti_v5 (" +
                    "id, nome, cognome, dataNascita, classeS, classeSB, classeSM, stato, " +
                    "fattoreVolume, volumeAuto, note, sesso, metriMaxSeduta) " +
                    "SELECT id, nome, cognome, dataNascita, classeS, classeSB, classeSM, stato, " +
                    "fattoreVolume, 1, note, $sesso, $metriMax FROM atleti"
            )
            db.execSQL("DROP TABLE atleti")
            db.execSQL("ALTER TABLE atleti_v5 RENAME TO atleti")

            db.execSQL(
                "CREATE TABLE condizioni_mediche (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "atletaId INTEGER NOT NULL, descrizione TEXT NOT NULL, limitazioni TEXT NOT NULL, " +
                    "attiva INTEGER NOT NULL, " +
                    "FOREIGN KEY(atletaId) REFERENCES atleti(id) ON UPDATE NO ACTION ON DELETE CASCADE)"
            )
            db.execSQL(
                "CREATE TABLE assenze (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "atletaId INTEGER NOT NULL, dal INTEGER NOT NULL, al INTEGER NOT NULL, motivo TEXT NOT NULL, " +
                    "FOREIGN KEY(atletaId) REFERENCES atleti(id) ON UPDATE NO ACTION ON DELETE CASCADE)"
            )
            db.execSQL(
                "CREATE TABLE atleta_attributi (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "atletaId INTEGER NOT NULL, chiave TEXT NOT NULL, valore TEXT NOT NULL, " +
                    "FOREIGN KEY(atletaId) REFERENCES atleti(id) ON UPDATE NO ACTION ON DELETE CASCADE)"
            )
            db.execSQL(
                "CREATE TABLE tempi (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "atletaId INTEGER NOT NULL, data INTEGER NOT NULL, stile TEXT NOT NULL, " +
                    "distanzaMetri INTEGER NOT NULL, centesimi INTEGER NOT NULL, contesto TEXT NOT NULL, " +
                    "vascaMetri INTEGER NOT NULL, note TEXT NOT NULL, " +
                    "FOREIGN KEY(atletaId) REFERENCES atleti(id) ON UPDATE NO ACTION ON DELETE CASCADE)"
            )
            db.execSQL(
                "CREATE TABLE log_sedute (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "atletaId INTEGER NOT NULL, data INTEGER NOT NULL, presente INTEGER NOT NULL, " +
                    "durataMin INTEGER NOT NULL, metriEffettivi INTEGER NOT NULL, rpe INTEGER, note TEXT NOT NULL, " +
                    "FOREIGN KEY(atletaId) REFERENCES atleti(id) ON UPDATE NO ACTION ON DELETE CASCADE)"
            )
            db.execSQL(
                "CREATE TABLE ranking_atleta (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "atletaId INTEGER NOT NULL, stile TEXT NOT NULL, distanzaMetri INTEGER NOT NULL, " +
                    "ambito TEXT NOT NULL, posizione INTEGER NOT NULL, aggiornatoIl INTEGER NOT NULL, " +
                    "FOREIGN KEY(atletaId) REFERENCES atleti(id) ON UPDATE NO ACTION ON DELETE CASCADE)"
            )
            db.execSQL(
                "INSERT INTO condizioni_mediche SELECT id, atletaId, descrizione, limitazioni, attiva " +
                    "FROM condizioni_mediche_backup"
            )
            db.execSQL("INSERT INTO assenze SELECT id, atletaId, dal, al, motivo FROM assenze_backup")
            db.execSQL(
                "INSERT INTO atleta_attributi SELECT id, atletaId, chiave, valore FROM atleta_attributi_backup"
            )
            db.execSQL(
                "INSERT INTO tempi SELECT id, atletaId, data, stile, distanzaMetri, centesimi, contesto, vascaMetri, note " +
                    "FROM tempi_backup"
            )
            db.execSQL(
                "INSERT INTO log_sedute SELECT id, atletaId, data, presente, durataMin, metriEffettivi, rpe, note " +
                    "FROM log_sedute_backup"
            )
            db.execSQL(
                "INSERT INTO ranking_atleta " +
                    "SELECT id, atletaId, stile, distanzaMetri, ambito, posizione, aggiornatoIl " +
                    "FROM ranking_atleta_backup"
            )
            figli.forEach { tabella -> db.execSQL("DROP TABLE ${tabella}_backup") }
        } else {
            db.execSQL("DROP TABLE IF EXISTS ranking_atleta_v5")
            db.execSQL(
                "CREATE TABLE ranking_atleta_v5 (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                    "atletaId INTEGER NOT NULL, stile TEXT NOT NULL, distanzaMetri INTEGER NOT NULL, " +
                    "ambito TEXT NOT NULL, posizione INTEGER NOT NULL, aggiornatoIl INTEGER NOT NULL, " +
                    "FOREIGN KEY(atletaId) REFERENCES atleti(id) ON UPDATE NO ACTION ON DELETE CASCADE)"
            )
            db.execSQL(
                "INSERT INTO ranking_atleta_v5 " +
                    "SELECT id, atletaId, stile, distanzaMetri, ambito, posizione, aggiornatoIl " +
                    "FROM ranking_atleta"
            )
            db.execSQL("DROP TABLE ranking_atleta")
            db.execSQL("ALTER TABLE ranking_atleta_v5 RENAME TO ranking_atleta")
        }

        val livello = if (colonnaEsistente("gare", "livello")) "livello" else "'ALTRO'"
        db.execSQL("DROP TABLE IF EXISTS gare_v5")
        db.execSQL(
            "CREATE TABLE gare_v5 (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                "stagioneId INTEGER NOT NULL, nome TEXT NOT NULL, dal INTEGER NOT NULL, al INTEGER NOT NULL, " +
                "luogo TEXT NOT NULL, prioritaria INTEGER NOT NULL, livello TEXT NOT NULL, " +
                "FOREIGN KEY(stagioneId) REFERENCES stagioni(id) ON UPDATE NO ACTION ON DELETE CASCADE)"
        )
        db.execSQL(
            "INSERT INTO gare_v5 (id, stagioneId, nome, dal, al, luogo, prioritaria, livello) " +
                "SELECT id, stagioneId, nome, dal, al, luogo, prioritaria, $livello FROM gare"
        )
        db.execSQL("DROP TABLE gare")
        db.execSQL("ALTER TABLE gare_v5 RENAME TO gare")

        db.execSQL("DROP INDEX IF EXISTS index_tempi_atletaId_data")
        db.execSQL("DROP INDEX IF EXISTS index_tempi_atletaId")
        db.execSQL("CREATE INDEX index_tempi_atletaId ON tempi(atletaId)")
        db.execSQL("DROP INDEX IF EXISTS index_log_sedute_atletaId_data")
        db.execSQL("DROP INDEX IF EXISTS index_log_sedute_atletaId")
        db.execSQL("CREATE INDEX index_log_sedute_atletaId ON log_sedute(atletaId)")
        db.execSQL("CREATE INDEX index_gare_stagioneId ON gare(stagioneId)")
        db.execSQL("CREATE INDEX index_ranking_atleta_atletaId ON ranking_atleta(atletaId)")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_condizioni_mediche_atletaId ON condizioni_mediche(atletaId)")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_assenze_atletaId ON assenze(atletaId)")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_atleta_attributi_atletaId ON atleta_attributi(atletaId)")
    }
}

@Database(
    entities = [
        Atleta::class, CondizioneMedica::class, Assenza::class, AtletaAttributo::class,
        Stagione::class, Macrociclo::class, Mesociclo::class, Microciclo::class,
        Chiusura::class, Gara::class, Tempo::class, LogSeduta::class, RankingAtleta::class
    ],
    version = 5,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun atletaDao(): AtletaDao
    abstract fun pianoDao(): PianoDao
    abstract fun registroDao(): RegistroDao
    abstract fun rankingDao(): RankingDao

    companion object {
        @Volatile
        private var istanza: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            istanza ?: synchronized(this) {
                istanza ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "nuoto.db"
                ).addMigrations(MIGRAZIONE_1_2, MIGRAZIONE_2_3, MIGRAZIONE_3_4, MIGRAZIONE_4_5).build().also { istanza = it }
            }
    }
}
