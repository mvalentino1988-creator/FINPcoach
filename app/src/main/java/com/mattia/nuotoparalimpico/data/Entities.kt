package com.mattia.nuotoparalimpico.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.LocalDate

enum class StatoClassificazione { UFFICIALE, IN_ATTESA }

enum class FaseMesociclo(val etichetta: String) {
    PREPARAZIONE_GENERALE("Preparazione generale"),
    PREPARAZIONE_SPECIFICA("Preparazione specifica"),
    PRE_GARA("Pre-gara"),
    COMPETITIVA("Competitiva")
}

enum class TipoMicrociclo(val etichetta: String) {
    ADATTAMENTO("Adattamento"),
    CARICO("Carico"),
    SCARICO("Scarico"),
    GARA("Gara"),
    RECUPERO("Recupero post-gara"),
    PAUSA("Pausa")
}

enum class Stile { STILE_LIBERO, DORSO, RANA, FARFALLA, MISTI }
enum class ContestoTempo { GARA, ALLENAMENTO, TEST }

// ---------- ATLETI ----------

@Entity(tableName = "atleti")
data class Atleta(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val nome: String,
    val cognome: String,
    val dataNascita: LocalDate? = null,
    val classeS: Int? = null,   // libero/dorso/farfalla
    val classeSB: Int? = null,  // rana
    val classeSM: Int? = null,  // misti
    val stato: StatoClassificazione = StatoClassificazione.IN_ATTESA,
    /** 1.0 = volume pieno di squadra; 0.8 = 80% ecc. */
    val fattoreVolume: Double = 1.0,
    val note: String = "",
    /** true = il fattore volume lo calcola l'app (età, condizioni, classe); false = deciso a mano. */
    @ColumnInfo(defaultValue = "1") val volumeAuto: Boolean = true
)

@Entity(
    tableName = "condizioni_mediche",
    foreignKeys = [ForeignKey(entity = Atleta::class, parentColumns = ["id"], childColumns = ["atletaId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("atletaId")]
)
data class CondizioneMedica(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val atletaId: Long,
    val descrizione: String,
    val limitazioni: String = "",
    val attiva: Boolean = true
)

@Entity(
    tableName = "assenze",
    foreignKeys = [ForeignKey(entity = Atleta::class, parentColumns = ["id"], childColumns = ["atletaId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("atletaId")]
)
data class Assenza(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val atletaId: Long,
    val dal: LocalDate,
    val al: LocalDate,
    val motivo: String = ""
)

/** Campi liberi chiave-valore: per nuove esigenze senza cambiare lo schema. */
@Entity(
    tableName = "atleta_attributi",
    foreignKeys = [ForeignKey(entity = Atleta::class, parentColumns = ["id"], childColumns = ["atletaId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("atletaId")]
)
data class AtletaAttributo(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val atletaId: Long,
    val chiave: String,
    val valore: String
)

// ---------- PROGRAMMAZIONE ----------

@Entity(tableName = "stagioni")
data class Stagione(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val nome: String,
    val inizio: LocalDate,
    val fine: LocalDate,
    val vascaMetri: Int = 25
)

@Entity(
    tableName = "macrocicli",
    foreignKeys = [ForeignKey(entity = Stagione::class, parentColumns = ["id"], childColumns = ["stagioneId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("stagioneId")]
)
data class Macrociclo(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val stagioneId: Long,
    val nome: String,
    val inizio: LocalDate,
    val fine: LocalDate,
    val obiettivo: String = ""
)

@Entity(
    tableName = "mesocicli",
    foreignKeys = [ForeignKey(entity = Macrociclo::class, parentColumns = ["id"], childColumns = ["macrocicloId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("macrocicloId")]
)
data class Mesociclo(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val macrocicloId: Long,
    val fase: FaseMesociclo,
    val inizio: LocalDate,
    val fine: LocalDate
)

@Entity(
    tableName = "microcicli",
    foreignKeys = [ForeignKey(entity = Mesociclo::class, parentColumns = ["id"], childColumns = ["mesocicloId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("mesocicloId")]
)
data class Microciclo(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val mesocicloId: Long,
    val inizio: LocalDate,      // sempre un lunedì
    val fine: LocalDate,        // sempre la domenica successiva
    val tipo: TipoMicrociclo,
    val sedutePreviste: Int,
    val volumeTargetMetri: Int, // totale della settimana, volume di squadra al 100%
    val note: String = "",
    /** true = modificato a mano: sopravvive alla rigenerazione del piano. */
    @ColumnInfo(defaultValue = "0") val bloccato: Boolean = false
)

@Entity(
    tableName = "chiusure",
    foreignKeys = [ForeignKey(entity = Stagione::class, parentColumns = ["id"], childColumns = ["stagioneId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("stagioneId")]
)
data class Chiusura(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val stagioneId: Long,
    val dal: LocalDate,
    val al: LocalDate,
    val motivo: String
)

@Entity(
    tableName = "gare",
    foreignKeys = [ForeignKey(entity = Stagione::class, parentColumns = ["id"], childColumns = ["stagioneId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("stagioneId")]
)
data class Gara(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val stagioneId: Long,
    val nome: String,
    val dal: LocalDate,
    val al: LocalDate,
    val luogo: String = "",
    val prioritaria: Boolean = false
)

// ---------- LOG E TEMPI ----------

@Entity(
    tableName = "tempi",
    foreignKeys = [ForeignKey(entity = Atleta::class, parentColumns = ["id"], childColumns = ["atletaId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("atletaId")]
)
data class Tempo(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val atletaId: Long,
    val data: LocalDate,
    val stile: Stile,
    val distanzaMetri: Int,
    val centesimi: Int,          // 1:02.35 -> 6235
    val contesto: ContestoTempo,
    val vascaMetri: Int = 25,
    val note: String = ""
)

@Entity(
    tableName = "log_sedute",
    foreignKeys = [ForeignKey(entity = Atleta::class, parentColumns = ["id"], childColumns = ["atletaId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("atletaId")]
)
data class LogSeduta(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val atletaId: Long,
    val data: LocalDate,
    val presente: Boolean = true,
    val durataMin: Int = 0,
    val metriEffettivi: Int = 0,
    val rpe: Int? = null,        // 1-10
    val note: String = ""
)

// ---------- Strutture di passaggio (non sono tabelle) ----------

data class MesoGen(val meso: Mesociclo, val micro: List<Microciclo>)
data class MacroGen(val macro: Macrociclo, val meso: List<MesoGen>)