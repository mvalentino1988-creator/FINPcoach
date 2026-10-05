package com.mattia.nuotoparalimpico.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
abstract class RankingDao {
    @Query("SELECT * FROM ranking_atleta ORDER BY aggiornatoIl DESC, id DESC")
    abstract fun osserva(): Flow<List<RankingAtleta>>

    @Query("SELECT * FROM ranking_atleta WHERE atletaId = :atletaId")
    abstract suspend fun leggi(atletaId: Long): List<RankingAtleta>

    @Insert
    abstract suspend fun inserisci(r: RankingAtleta)

    @Delete
    abstract suspend fun elimina(r: RankingAtleta)

    /** Per ogni atleta/gara/ambito esiste una sola posizione: salvarne una nuova sostituisce la vecchia. */
    @Transaction
    open suspend fun salva(r: RankingAtleta) {
        leggi(r.atletaId)
            .filter { it.stile == r.stile && it.distanzaMetri == r.distanzaMetri && it.ambito == r.ambito }
            .forEach { elimina(it) }
        inserisci(r.copy(id = 0))
    }
}