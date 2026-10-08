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

/** v5: aggiunge sesso e limite di volume all'atleta e il livello gara, senza perdere dati. */
val MIGRAZIONE_4_5 = object : Migration(4, 5) {
    override fun migrate(db: SupportSQLiteDatabase) {
        fun aggiungiColonnaSeAssente(tabella: String, colonna: String, definizione: String) {
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
            if (!esiste) db.execSQL("ALTER TABLE $tabella ADD COLUMN $colonna $definizione")
        }

        aggiungiColonnaSeAssente("atleti", "sesso", "TEXT")
        aggiungiColonnaSeAssente("atleti", "metriMaxSeduta", "INTEGER")
        aggiungiColonnaSeAssente("gare", "livello", "TEXT NOT NULL DEFAULT 'ALTRO'")
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
