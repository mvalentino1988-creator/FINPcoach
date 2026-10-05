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

/** v3: sesso e volume massimo per atleta, tabella dei ranking. I dati esistenti restano. */
val MIGRAZIONE_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE atleti ADD COLUMN sesso TEXT")
        db.execSQL("ALTER TABLE atleti ADD COLUMN metriMaxSeduta INTEGER")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `ranking_atleta` (" +
                "`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                "`atletaId` INTEGER NOT NULL, " +
                "`stile` TEXT NOT NULL, " +
                "`distanzaMetri` INTEGER NOT NULL, " +
                "`ambito` TEXT NOT NULL, " +
                "`posizione` INTEGER NOT NULL, " +
                "`aggiornatoIl` INTEGER NOT NULL, " +
                "FOREIGN KEY(`atletaId`) REFERENCES `atleti`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE )"
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_ranking_atleta_atletaId` ON `ranking_atleta` (`atletaId`)")
    }
}

@Database(
    entities = [
        Atleta::class, CondizioneMedica::class, Assenza::class, AtletaAttributo::class,
        Stagione::class, Macrociclo::class, Mesociclo::class, Microciclo::class,
        Chiusura::class, Gara::class, Tempo::class, LogSeduta::class, RankingAtleta::class
    ],
    version = 3,
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
                ).addMigrations(MIGRAZIONE_1_2, MIGRAZIONE_2_3).build().also { istanza = it }
            }
    }
}