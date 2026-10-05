package com.mattia.nuotoparalimpico.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.OnConflictStrategy
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

@Dao
abstract class RegistroDao {
    // ----- Tempi -----
    @Query("SELECT * FROM tempi ORDER BY data DESC, id DESC")
    abstract fun osservaTempi(): Flow<List<Tempo>>

    @Insert
    abstract suspend fun inserisciTempo(tempo: Tempo)

    @Delete
    abstract suspend fun eliminaTempo(tempo: Tempo)

    // ----- Log sedute -----
    @Query("SELECT * FROM log_sedute ORDER BY data DESC, id DESC")
    abstract fun osservaLog(): Flow<List<LogSeduta>>

    @Query("DELETE FROM log_sedute WHERE data = :data")
    abstract suspend fun eliminaLogDelGiorno(data: LocalDate)

    @Insert
    abstract suspend fun inserisciLog(log: List<LogSeduta>)

    /** Salvare due volte la stessa data sostituisce la seduta precedente. */
    @Transaction
    open suspend fun salvaSeduta(data: LocalDate, log: List<LogSeduta>) {
        eliminaLogDelGiorno(data)
        inserisciLog(log)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun inserisciLog(log: List<LogSeduta>)
    }
}
