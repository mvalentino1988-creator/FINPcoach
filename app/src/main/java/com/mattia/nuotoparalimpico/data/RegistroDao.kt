package com.mattia.nuotoparalimpico.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

@Dao
abstract class RegistroDao {
    // Lettura aggregata di tutti i tempi; le scritture sui tempi passano da AtletaDao.
    @Query("SELECT * FROM tempi ORDER BY data DESC, id DESC")
    abstract fun osservaTempi(): Flow<List<Tempo>>

    @Query("SELECT * FROM log_sedute ORDER BY data DESC, id DESC")
    abstract fun osservaLog(): Flow<List<LogSeduta>>

    @Query("DELETE FROM log_sedute WHERE data = :data")
    abstract suspend fun eliminaLogDelGiorno(data: LocalDate)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun inserisciLog(log: List<LogSeduta>)

    /** Salvare due volte la stessa data sostituisce la seduta precedente. */
    @Transaction
    open suspend fun salvaSeduta(data: LocalDate, log: List<LogSeduta>) {
        eliminaLogDelGiorno(data)
        inserisciLog(log)
    }
}