package com.mattia.nuotoparalimpico.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

@Dao
abstract class RegistroDao {
    @Query("SELECT * FROM tempi WHERE atletaId = :atletaId ORDER BY data DESC, id DESC")
    abstract fun osservaTempi(atletaId: Long): Flow<List<Tempo>>

    @Query("SELECT * FROM tempi ORDER BY data DESC, id DESC")
    abstract fun osservaTempi(): Flow<List<Tempo>>

    @Query("SELECT * FROM tempi WHERE atletaId = :atletaId ORDER BY data DESC, id DESC")
    abstract suspend fun leggiTempi(atletaId: Long): List<Tempo>

    @Insert
    abstract suspend fun inserisciTempo(tempo: Tempo)

    @Delete
    abstract suspend fun eliminaTempo(tempo: Tempo)

    @Query("SELECT * FROM log_sedute WHERE atletaId = :atletaId ORDER BY data DESC, id DESC")
    abstract fun osservaLog(atletaId: Long): Flow<List<LogSeduta>>

    @Query("SELECT * FROM log_sedute ORDER BY data DESC, id DESC")
    abstract fun osservaLog(): Flow<List<LogSeduta>>

    @Query("SELECT * FROM log_sedute WHERE atletaId = :atletaId ORDER BY data DESC, id DESC")
    abstract suspend fun leggiLog(atletaId: Long): List<LogSeduta>

    @Insert
    abstract suspend fun inserisciLog(log: LogSeduta)

    @Update
    abstract suspend fun aggiornaLog(log: LogSeduta)

    @Query("DELETE FROM log_sedute WHERE data = :data")
    abstract suspend fun eliminaLogDelGiorno(data: LocalDate)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun inserisciLog(log: List<LogSeduta>)

    /** Una seduta per atleta e giorno: salvare la data sostituisce tutte le righe del giorno. */
    @Transaction
    open suspend fun salvaSeduta(data: LocalDate, log: List<LogSeduta>) {
        eliminaLogDelGiorno(data)
        inserisciLog(log)
    }
}