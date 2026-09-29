package com.mattia.nuotoparalimpico.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import java.time.LocalDate

class Converters {
    @TypeConverter
    fun daLong(valore: Long?): LocalDate? = valore?.let { LocalDate.ofEpochDay(it) }

    @TypeConverter
    fun aLong(data: LocalDate?): Long? = data?.toEpochDay()
}

@Database(
    entities = [
        Atleta::class, CondizioneMedica::class, Assenza::class, AtletaAttributo::class,
        Stagione::class, Macrociclo::class, Mesociclo::class, Microciclo::class,
        Chiusura::class, Gara::class, Tempo::class, LogSeduta::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun atletaDao(): AtletaDao
    abstract fun pianoDao(): PianoDao

    companion object {
        @Volatile
        private var istanza: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            istanza ?: synchronized(this) {
                istanza ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "nuoto.db"
                ).build().also { istanza = it }
            }
    }
}
