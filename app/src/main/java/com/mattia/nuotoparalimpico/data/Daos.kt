package com.mattia.nuotoparalimpico.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface AtletaDao {
    @Query("SELECT * FROM atleti ORDER BY cognome, nome")
    fun osservaAtleti(): Flow<List<Atleta>>

    @Insert
    suspend fun inserisci(atleta: Atleta): Long

    @Update
    suspend fun aggiorna(atleta: Atleta)

    @Delete
    suspend fun elimina(atleta: Atleta)

    @Query("SELECT * FROM condizioni_mediche")
    fun osservaCondizioni(): Flow<List<CondizioneMedica>>

    @Insert
    suspend fun inserisciCondizione(condizione: CondizioneMedica)

    @Delete
    suspend fun eliminaCondizione(condizione: CondizioneMedica)

    @Query("SELECT * FROM assenze ORDER BY dal DESC")
    fun osservaAssenze(): Flow<List<Assenza>>

    @Insert
    suspend fun inserisciAssenza(assenza: Assenza)

    @Delete
    suspend fun eliminaAssenza(assenza: Assenza)

    // ----- Tempi -----
    @Query("SELECT * FROM tempi WHERE atletaId = :atletaId ORDER BY data DESC")
    fun osservaTempi(atletaId: Long): Flow<List<Tempo>>

    @Query("SELECT * FROM tempi WHERE atletaId = :atletaId ORDER BY data DESC")
    suspend fun leggiTempi(atletaId: Long): List<Tempo>

    @Insert
    suspend fun inserisciTempo(tempo: Tempo)

    @Delete
    suspend fun eliminaTempo(tempo: Tempo)

    // ----- Log Sedute -----
    @Query("SELECT * FROM log_sedute WHERE atletaId = :atletaId ORDER BY data DESC")
    fun osservaLogSedute(atletaId: Long): Flow<List<LogSeduta>>

    @Query("SELECT * FROM log_sedute WHERE atletaId = :atletaId ORDER BY data DESC")
    suspend fun leggiLogSedute(atletaId: Long): List<LogSeduta>

    @Insert
    suspend fun inserisciLogSeduta(log: LogSeduta)

    @Update
    suspend fun aggiornaLogSeduta(log: LogSeduta)
}

@Dao
abstract class PianoDao {
    // ----- Stagione -----
    @Query("SELECT * FROM stagioni ORDER BY inizio DESC LIMIT 1")
    abstract fun osservaStagione(): Flow<Stagione?>

    @Insert
    abstract suspend fun inserisciStagione(stagione: Stagione): Long

    @Update
    abstract suspend fun aggiornaStagione(stagione: Stagione)

    @Delete
    abstract suspend fun eliminaStagione(stagione: Stagione)

    // ----- Chiusure -----
    @Query("SELECT * FROM chiusure WHERE stagioneId = :stagioneId ORDER BY dal")
    abstract fun osservaChiusure(stagioneId: Long): Flow<List<Chiusura>>

    @Query("SELECT * FROM chiusure WHERE stagioneId = :stagioneId ORDER BY dal")
    abstract suspend fun leggiChiusure(stagioneId: Long): List<Chiusura>

    @Insert
    abstract suspend fun inserisciChiusura(chiusura: Chiusura)

    @Insert
    abstract suspend fun inserisciChiusure(chiusure: List<Chiusura>)

    @Delete
    abstract suspend fun eliminaChiusura(chiusura: Chiusura)

    // ----- Gare -----
    @Query("SELECT * FROM gare WHERE stagioneId = :stagioneId ORDER BY dal")
    abstract fun osservaGare(stagioneId: Long): Flow<List<Gara>>

    @Query("SELECT * FROM gare WHERE stagioneId = :stagioneId ORDER BY dal")
    abstract suspend fun leggiGare(stagioneId: Long): List<Gara>

    @Insert
    abstract suspend fun inserisciGara(gara: Gara)

    @Delete
    abstract suspend fun eliminaGara(gara: Gara)

    // ----- Piano (macro / meso / micro) -----
    @Query("SELECT * FROM macrocicli WHERE stagioneId = :stagioneId ORDER BY inizio")
    abstract fun osservaMacro(stagioneId: Long): Flow<List<Macrociclo>>

    @Query(
        "SELECT me.* FROM mesocicli me JOIN macrocicli ma ON me.macrocicloId = ma.id " +
                "WHERE ma.stagioneId = :stagioneId ORDER BY me.inizio"
    )
    abstract fun osservaMeso(stagioneId: Long): Flow<List<Mesociclo>>

    @Query(
        "SELECT mi.* FROM microcicli mi " +
                "JOIN mesocicli me ON mi.mesocicloId = me.id " +
                "JOIN macrocicli ma ON me.macrocicloId = ma.id " +
                "WHERE ma.stagioneId = :stagioneId ORDER BY mi.inizio"
    )
    abstract fun osservaMicro(stagioneId: Long): Flow<List<Microciclo>>

    @Query(
        "SELECT mi.* FROM microcicli mi " +
                "JOIN mesocicli me ON mi.mesocicloId = me.id " +
                "JOIN macrocicli ma ON me.macrocicloId = ma.id " +
                "WHERE ma.stagioneId = :stagioneId ORDER BY mi.inizio"
    )
    abstract suspend fun leggiMicro(stagioneId: Long): List<Microciclo>

    @Update
    abstract suspend fun aggiornaMicro(micro: Microciclo)

    @Query("DELETE FROM macrocicli WHERE stagioneId = :stagioneId")
    abstract suspend fun eliminaPiano(stagioneId: Long)

    @Insert
    abstract suspend fun inserisciMacro(macro: Macrociclo): Long

    @Insert
    abstract suspend fun inserisciMeso(meso: Mesociclo): Long

    @Insert
    abstract suspend fun inserisciMicro(micro: List<Microciclo>)

    /** Sostituisce l'intero piano della stagione in un'unica transazione. */
    @Transaction
    open suspend fun salvaPiano(stagioneId: Long, piano: List<MacroGen>) {
        eliminaPiano(stagioneId)
        for (macroGen in piano) {
            val macroId = inserisciMacro(macroGen.macro.copy(stagioneId = stagioneId))
            for (mesoGen in macroGen.meso) {
                val mesoId = inserisciMeso(mesoGen.meso.copy(macrocicloId = macroId))
                inserisciMicro(mesoGen.micro.map { it.copy(mesocicloId = mesoId) })
            }
        }
    }
}