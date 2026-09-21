# Port Control Center — Manuale di installazione e utilizzo

Versione del documento: 21 settembre 2026
Applicazione: Port Control Center — interfaccia interattiva di gestione e controllo di un porto commerciale

---

## 1. Che cosa è Port Control Center

Port Control Center è un'applicazione web in cui il porto stesso è l'interfaccia di accesso alle funzioni operative. Non è un dashboard di indicatori: la pianta del porto è cliccabile e da ogni elemento fisico si raggiungono le funzioni, le attività e i software che le supportano.

La catena di accesso è sempre la stessa:

```
PORTO -> AREA FISICA -> FUNZIONE -> ATTIVITA -> SOFTWARE -> OPERAZIONE
```

L'applicazione non contiene alcun elenco di software predefinito. Tutti i software sono inseriti dall'utente, importando elenchi da file (Excel, CSV, Word) oppure aggiungendo voci singole (indirizzi web, applicazioni .exe, documenti). Se non è stato caricato nulla, l'interfaccia mostra il messaggio: "Nessun software configurato. Importare uno o più file Excel."

### 1.1 Funzioni principali

| Area dell'applicazione | Che cosa permette di fare |
| --- | --- |
| Mappa operativa | Navigare il porto per aree fisiche, funzioni e attività; cercare qualsiasi elemento; aprire i software associati |
| Gestione software | Importare e aggiornare elenchi da Excel/CSV/Word, inserire voci singole (URL, .exe, documenti), gestire le fonti |
| Registro software | Elenco completo con filtri, indicatori di qualità del dato, rilevamento duplicati, esportazione CSV |
| Albero associazioni | Vista gerarchica area → funzione → attività → software, con conteggi e software fuori dall'albero |
| Struttura del porto | Configurare aree fisiche, funzioni e attività (aggiunta, rinomina, riordino, eliminazione, ripristino) |

---

## 2. Requisiti

### 2.1 Requisiti software

| Componente | Versione richiesta | Note |
| --- | --- | --- |
| Node.js | 20 LTS o superiore | Verificato su Node.js 20.20.1 |
| npm | 10 o superiore | Verificato su npm 10.8.2 |
| Sistema operativo | Windows 10/11, macOS, Linux | Nessun servizio esterno richiesto |
| Browser | Chrome, Edge, Firefox o Safari aggiornati | Interfaccia responsive, usabile anche da tablet |

Il database è SQLite incorporato: non serve installare né configurare un server di database.

### 2.2 Requisiti hardware

Indicativi per un'installazione singola o di reparto: 2 core CPU, 2 GB di RAM liberi, 500 MB di spazio su disco (dipendenze incluse). L'archivio dati cresce di poche centinaia di kilobyte per migliaia di record.

### 2.3 Rete

L'applicazione ascolta per impostazione predefinita sulla porta 5000. Per l'uso da parte di più postazioni è sufficiente che la porta sia raggiungibile nella rete locale.

---

## 3. Installazione

### 3.1 Contenuto della cartella di progetto

```
port-control-center/
  client/           interfaccia (React + Vite)
    src/pages/      mappa, gestione, registro, albero, struttura
    src/components/ pianta del porto, ricerca, scheda software, associazioni
    src/lib/        lettura Excel/CSV, lettura documenti Word, dati derivati
  server/           API (Express)
    routes.ts       tutti gli endpoint /api
    storage.ts      accesso al database SQLite e migrazioni automatiche
    docx.ts         lettore di file .docx senza dipendenze esterne
  shared/           modello dati, tassonomia iniziale, geometria della pianta
  script/build.ts   procedura di compilazione
  data.db           database SQLite (creato al primo avvio)
```

### 3.2 Installazione passo per passo

1. Copiare la cartella `port-control-center` sulla macchina di destinazione.
2. Aprire un terminale nella cartella del progetto.
3. Installare le dipendenze:

   ```bash
   npm install
   ```

4. Avviare l'applicazione in modalità sviluppo per una prima verifica:

   ```bash
   npm run dev
   ```

5. Aprire il browser su `http://localhost:5000`. Alla prima apertura il database viene creato e la struttura del porto viene precaricata con la tassonomia iniziale (18 aree portuali, 42 funzioni, 145 attività). Nessun software è presente: è corretto.

### 3.3 Installazione per l'uso in produzione

1. Compilare l'applicazione:

   ```bash
   npm run build
   ```

   Vengono prodotti il server compilato (`dist/index.cjs`) e l'interfaccia statica (`dist/public`).

2. Avviare in modalità produzione:

   ```bash
   npm start
   ```

3. Per cambiare porta impostare la variabile d'ambiente `PORT`:

   ```bash
   PORT=8080 npm start
   ```

   Su Windows PowerShell: `$env:PORT=8080; npm start`.

### 3.4 Comandi disponibili

| Comando | Effetto |
| --- | --- |
| `npm run dev` | Avvia server e interfaccia con ricarica automatica (sviluppo) |
| `npm run build` | Compila server e interfaccia in `dist/` |
| `npm start` | Avvia la versione compilata |
| `npm run check` | Verifica i tipi TypeScript senza compilare |
| `npm run db:push` | Allinea lo schema del database al modello dati |

### 3.5 Avvio automatico come servizio

Su Linux con systemd, creare `/etc/systemd/system/port-control-center.service`:

```ini
[Unit]
Description=Port Control Center
After=network.target

[Service]
WorkingDirectory=/opt/port-control-center
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/node dist/index.cjs
Restart=always

[Install]
WantedBy=multi-user.target
```

Poi `sudo systemctl enable --now port-control-center`.

### 3.6 Database, backup e ripristino

Tutti i dati risiedono nel file `data.db` nella cartella di lavoro da cui è stato avviato il processo.

- Backup: arrestare l'applicazione e copiare `data.db` (insieme a eventuali `data.db-wal` e `data.db-shm` se presenti).
- Ripristino: sostituire il file con la copia di backup e riavviare.
- Azzeramento completo: arrestare l'applicazione, rinominare o cancellare `data.db`, riavviare. La struttura del porto viene ricreata dalla tassonomia iniziale e il registro software torna vuoto.

Si consiglia un backup pianificato giornaliero del file di database.

---

## 4. Primo utilizzo: percorso consigliato

1. Verificare la struttura del porto in "Struttura del porto" e adattarla alla realtà dello scalo (rinominare aree, aggiungere funzioni e attività mancanti, eliminare ciò che non esiste).
2. Importare il primo elenco di software in "Gestione software" con "Aggiungi elenco da file".
3. Controllare gli indicatori nel "Registro software": software senza funzione, senza riferimento, non classificati, possibili duplicati.
4. Completare le associazioni dal registro, dalla mappa o dall'albero.
5. Verificare la copertura in "Albero associazioni" e in particolare la voce "Software fuori dall'albero".

---

## 5. Mappa operativa

La mappa è la pagina iniziale e rappresenta il porto: avamporto e imboccatura, servizi tecnico-nautici, banchine e accosti, navi (portacontainer, rinfusiera, ro-ro, passeggeri), terminal container, rinfuse, ro-ro e passeggeri, magazzini e depositi, scanner e controlli non intrusivi, area doganale, varchi e gate, security e sorveglianza, controlli sanitari e fitosanitari, torre di controllo, area ferroviaria, autotrasporto e servizi, ambiente e rifiuti.

### 5.1 Navigare

1. Fare clic su un elemento della pianta: nel pannello laterale compaiono le funzioni dell'area.
2. Selezionare una funzione: compaiono le attività operative.
3. Selezionare un'attività: compaiono i software associati a quella specifica attività.
4. Fare clic su un software per aprirne la scheda, con descrizione, categoria, stato, ruolo autorizzato, riferimento (indirizzo web, percorso locale o applicazione desktop), note e fonte di origine del dato.

Le aree sono raggruppate per colore in sei categorie: specchio acqueo, banchina e nave, terminal operativi, controllo e sicurezza, intermodale e strada, servizi e ambiente. Le etichette sulla pianta indicano quanti software sono associati a ciascuna area.

### 5.2 Ricerca

Il campo di ricerca in alto trova aree, funzioni, attività e software. Selezionando un risultato l'applicazione porta direttamente al punto corrispondente della catena di accesso, aprendo automaticamente area, funzione e attività pertinenti.

---

## 6. Gestione software

È la sezione in cui si alimenta il registro. Nessuna operazione richiede modifiche al codice, alle mappe interne o una nuova compilazione: aggiungere una fonte è un'operazione d'uso.

### 6.1 Importare un elenco da file Excel o CSV

1. Premere "Aggiungi elenco da file" e selezionare il file (`.xlsx`, `.xls`, `.xlsm`, `.csv`).
2. L'applicazione legge il file e mostra l'anteprima: fogli rilevati, colonne trovate, prime righe di ciascun foglio.
3. Selezionare i fogli da importare. I fogli multipli sono gestiti: ogni foglio viene importato e tracciato separatamente.
4. Verificare la mappatura delle colonne proposta automaticamente e correggerla dove necessario.
5. Confermare l'importazione. I software entrano nel registro conservando l'indicazione del file, del foglio e della riga di origine.

Il solo campo obbligatorio è il nome del software. Tutti gli altri campi sono facoltativi: un elenco con due colonne è importabile esattamente come un elenco con quindici.

### 6.2 Campi riconosciuti e normalizzazione delle colonne

Le intestazioni vengono normalizzate automaticamente (maiuscole, accenti e spazi non contano). Campi interni e principali sinonimi riconosciuti:

| Campo interno | Intestazioni riconosciute |
| --- | --- |
| ID software | id, id software, codice, cod, sigla, codice software |
| Nome software (obbligatorio) | nome software, software, nome, applicazione, applicativo, programma, denominazione, titolo, app, sistema |
| Descrizione | descrizione, description, scopo, finalità, dettaglio, cosa fa |
| Area portuale | area, area portuale, zona, ambito, settore, reparto, luogo |
| Funzione | funzione, funzionalità, processo, macro processo, uso |
| Attività | attività, task, operazione, azione, attività collegata |
| Categoria | categoria, tipologia, tipo, classe, gruppo, famiglia |
| URL | url, link, indirizzo web, sito, web, collegamento, indirizzo, http |
| Percorso locale | percorso, percorso locale, path, cartella, file, directory |
| Applicazione desktop | applicazione desktop, desktop, eseguibile, exe, client |
| Note | note, annotazioni, commenti, osservazioni, remarks |
| Stato | stato, status, attivo, operativo, in uso |
| Ruolo autorizzato | ruolo, ruolo autorizzato, utenti, profilo, abilitazione, permessi |
| Icona | icona, icon, immagine, logo |
| Tipo di risorsa | tipo, tipologia, tipo risorsa, tipo software, natura |

Qualsiasi mappatura proposta può essere cambiata a mano nell'anteprima, e le colonne non pertinenti possono essere lasciate non associate: i valori originali restano comunque conservati nei dati grezzi della riga.

### 6.3 Importare un elenco da un documento Word (.docx)

1. Premere "Aggiungi elenco da file" e selezionare un file `.docx`.
2. L'applicazione estrae le tabelle del documento e i paragrafi. Ogni tabella diventa una sezione con le proprie colonne; i paragrafi vengono raccolti nella sezione "Paragrafi del documento".
3. L'anteprima indica "Documento Word" e il numero di sezioni rilevate.
4. Selezionare le sezioni, verificare la mappatura delle colonne e confermare, come per un Excel.

### 6.4 Inserire un singolo software (URL, .exe, documento)

1. Premere "Aggiungi singolo software".
2. Scegliere il tipo di risorsa: sito web, applicazione desktop (.exe), documento, altro.
3. Compilare il nome e, in base al tipo, l'indirizzo web o il percorso del file. Il pulsante "Scegli file" compila automaticamente il percorso partendo da un file locale.
4. Aggiungere facoltativamente descrizione, categoria, stato, note.
5. Facoltativamente associare subito la voce ad area, funzione e attività.
6. Salvare. La voce viene registrata nella fonte dedicata "Voci inserite manualmente", quindi resta tracciabile come qualunque altro record.

Scorciatoia: trascinando o selezionando direttamente un file `.exe`, `.msi`, `.lnk`, `.bat` o `.cmd`, l'applicazione apre la scheda della voce singola già precompilata con nome e percorso, invece di trattarlo come elenco.

### 6.5 Gestire le fonti già presenti

Ogni fonte è rappresentata da una scheda che mostra tipo (cartella Excel, documento Word, voci singole), numero di software, numero di fogli, numero di righe, versione, data di importazione e di ultimo aggiornamento.

| Operazione | Come si esegue | Effetto |
| --- | --- | --- |
| Aggiungere un'altra fonte | "Aggiungi elenco da file" | I dati restano separati per fonte; nulla viene sovrascritto |
| Aggiornare una fonte esistente | "Aggiorna" sulla scheda della fonte | Reimporta il file aggiornato mantenendo l'identità della fonte e incrementando la versione |
| Rinominare o etichettare una fonte | "Scheda" | Utile per distinguere elenchi provenienti da uffici diversi |
| Eliminare una fonte | Icona di eliminazione, con richiesta di conferma | Rimuove la fonte e i record che ne derivano |
| Ricalcolare le associazioni automatiche | "Riconosci associazioni" | Ripassa i testi di area, funzione e attività dei dati importati e propone i collegamenti |

L'associazione automatica si basa esclusivamente sui valori delle colonne di area, funzione e attività presenti nei dati: i nomi dei software non vengono interpretati e nessun collegamento viene inventato.

---

## 7. Registro software

Elenco completo e unico di tutti i software censiti, indipendentemente dalla fonte.

### 7.1 Indicatori di stato del registro

In testa alla pagina sono riportati: fonti importate, numero di software, numero di fogli, software senza funzione associata, software senza riferimento (nessun URL, percorso o eseguibile), possibili duplicati, software non classificati e associazioni configurate. Sono la lista di lavoro per completare il censimento.

### 7.2 Filtri e ricerca

Sono disponibili filtri per area, funzione, attività, categoria, tipo di risorsa, fonte di origine, foglio e stato, oltre alla ricerca libera per nome. I filtri si combinano tra loro.

### 7.3 Esportazione

Il pulsante di esportazione produce un file CSV con i campi del registro, incluse categoria, tipo di risorsa, riferimento, fonte, foglio e associazioni. Il CSV è riapribile in Excel.

### 7.4 Possibili duplicati

Quando due o più record hanno lo stesso nome normalizzato, l'applicazione segnala "Possibile software duplicato" senza modificare nulla. Le decisioni possibili sono: mantenere i record separati, collegarli tra loro, considerarli lo stesso software, indicare quale sia il record principale. Nessuna informazione viene eliminata automaticamente.

### 7.5 Modifica di un software

Dalla scheda di un software si possono correggere i campi descrittivi, il tipo di risorsa e il riferimento, aggiungere o rimuovere associazioni e cambiare l'associazione esistente scegliendo una diversa area, funzione o attività. La fonte di origine (file, foglio, riga e dati grezzi) resta sempre visibile e non viene alterata dalle modifiche.

---

## 8. Albero associazioni

Vista gerarchica di tutto il sistema: area fisica, funzione, attività, software, con il numero di software per ogni nodo. Serve a verificare la copertura reale.

- I nodi si espandono e si comprimono.
- I filtri permettono di isolare un'area, una funzione o una fonte.
- Da ogni nodo è possibile associare direttamente un software.
- La sezione "Software fuori dall'albero" elenca i software non ancora collegati ad alcun nodo: è l'elenco delle attività di classificazione ancora da fare.

---

## 9. Struttura del porto

La struttura non è fissa nel codice: aree fisiche, funzioni e attività sono dati configurabili e la pianta della mappa è generata da essi.

| Operazione | Note |
| --- | --- |
| Aggiungere un'area, una funzione o un'attività | L'area richiede nome e, facoltativamente, codice e categoria di colore |
| Rinominare | La modifica si riflette immediatamente su mappa, registro e albero |
| Riordinare | Determina l'ordine di presentazione nei pannelli e nell'albero |
| Eliminare | Prima dell'eliminazione viene mostrato l'impatto: quante funzioni, attività e associazioni sono coinvolte |
| Ripristinare la struttura predefinita | Riporta aree, funzioni e attività alla configurazione iniziale. Le fonti software e i software importati non vengono toccati; le associazioni verso nodi non più esistenti vengono rimosse |

Consiglio operativo: adattare la struttura prima di importare grandi elenchi, così l'associazione automatica dei testi ha maggiori probabilità di trovare corrispondenze.

---

## 10. Archivio delle fonti e tracciabilità

Ogni record importato conserva in modo permanente: fonte di origine, foglio o sezione, numero di riga e dati grezzi della riga così come si presentavano nel file. Questo consente di risalire sempre al documento di provenienza di ogni informazione, di ricostruire la storia di un dato e di verificare la differenza dopo un aggiornamento della fonte. Le voci inserite manualmente riportano come origine l'indicazione di inserimento manuale.

---

## 11. Riferimento delle API

Tutti gli endpoint sono sotto `/api` e scambiano JSON. Sono utili per integrazioni o per popolare il registro da script.

### 11.1 Struttura del porto

| Metodo e percorso | Descrizione |
| --- | --- |
| `GET /api/struttura` | Restituisce aree, funzioni e attività |
| `POST /api/aree` | Crea un'area |
| `PATCH /api/aree/:id` | Modifica un'area |
| `GET /api/aree/:id/impatto` | Impatto dell'eliminazione di un'area |
| `DELETE /api/aree/:id` | Elimina un'area |
| `POST /api/funzioni`, `PATCH /api/funzioni/:id`, `GET /api/funzioni/:id/impatto`, `DELETE /api/funzioni/:id` | Gestione funzioni |
| `POST /api/attivita`, `PATCH /api/attivita/:id`, `GET /api/attivita/:id/impatto`, `DELETE /api/attivita/:id` | Gestione attività |
| `POST /api/struttura/sposta` | Riordina un nodo |
| `POST /api/struttura/ripristina` | Ripristina la struttura predefinita |

### 11.2 Fonti e importazione

| Metodo e percorso | Descrizione |
| --- | --- |
| `GET /api/fonti` | Elenco delle fonti importate |
| `POST /api/import` | Importa un elenco normalizzato (fogli, righe, tipo di fonte) |
| `POST /api/fonti/:id/reimporta` | Aggiorna una fonte esistente incrementandone la versione |
| `PATCH /api/fonti/:id` | Modifica nome o etichetta della fonte |
| `DELETE /api/fonti/:id` | Elimina la fonte e i record derivati |
| `POST /api/documento` | Legge un `.docx` inviato in base64 e restituisce paragrafi e tabelle |

### 11.3 Software e associazioni

| Metodo e percorso | Descrizione |
| --- | --- |
| `GET /api/software` | Elenco completo dei software |
| `POST /api/software` | Crea una voce singola (sito web, applicazione desktop, documento, altro) |
| `PATCH /api/software/:id` | Modifica un software, incluso il tipo di risorsa e la gestione dei duplicati |
| `DELETE /api/software/:id` | Elimina un software |
| `GET /api/associazioni` | Elenco delle associazioni |
| `POST /api/associazioni` | Crea un'associazione software - area/funzione/attività |
| `PATCH /api/associazioni/:id` | Modifica un'associazione esistente |
| `DELETE /api/associazioni/:id` | Rimuove un'associazione |
| `POST /api/riassocia` | Ricalcola le associazioni automatiche dai testi importati |

Esempio di creazione di una voce singola:

```bash
curl -X POST http://localhost:5000/api/software \
  -H "Content-Type: application/json" \
  -d '{"tipo":"web","nome":"Portale gate","url":"https://intranet.example/gate","categoria":"Accessi"}'
```

---

## 12. Risoluzione dei problemi

| Sintomo | Causa probabile | Soluzione |
| --- | --- | --- |
| La pagina non si apre su `localhost:5000` | Porta occupata da un altro processo | Impostare `PORT` su un altro valore oppure terminare il processo che occupa la porta |
| Dopo un'importazione non compare alcun software | Nessun foglio selezionato, o colonna del nome non mappata | Ripetere l'importazione verificando nell'anteprima i fogli selezionati e la mappatura del campo "Nome software" |
| Il documento Word non produce righe | Il documento non contiene tabelle e i paragrafi non hanno la forma di elenco | Importare i dati da Excel oppure inserire le voci singolarmente |
| I software non compaiono sulla mappa | Sono presenti nel registro ma non associati | Usare "Riconosci associazioni" oppure associarli dal registro o dall'albero |
| Le associazioni automatiche non riconoscono un'area | I testi del file non corrispondono ai nomi della struttura | Allineare i nomi in "Struttura del porto" oppure correggere le associazioni a mano |
| Compaiono record doppi | Elenchi diversi contengono lo stesso software | Usare la sezione duplicati del registro e scegliere la decisione voluta; nulla viene cancellato automaticamente |
| Errore di tipo durante la compilazione | Dipendenze non installate o incomplete | Eseguire di nuovo `npm install` e poi `npm run check` |
| Dati mancanti dopo lo spostamento della cartella | Il database viene cercato nella cartella di lavoro corrente | Avviare l'applicazione dalla cartella che contiene `data.db` oppure copiare il file nella nuova posizione |

---

## 13. Domande frequenti

**Posso importare più file Excel?**
Sì. Non esiste un limite e i dati di file diversi restano separati e distinguibili, con la loro fonte, i loro fogli e le loro righe.

**Aggiungere un nuovo file richiede una modifica all'applicazione?**
No. L'importazione è un'operazione d'uso: non serve modificare codice, mappe interne o ricompilare.

**Un software può essere associato a più attività?**
Sì. Un software può comparire in più punti della catena, con un'associazione per ciascun nodo pertinente.

**Cosa succede se aggiorno un file già importato?**
La fonte mantiene la propria identità, la versione viene incrementata e la traccia dell'importazione precedente resta consultabile.

**È possibile lavorare in più persone?**
Sì, se l'applicazione è raggiungibile in rete. I dati sono conservati sul server, non nel browser.

**Posso ripartire da zero solo con i software, mantenendo la struttura?**
Sì: eliminare tutte le fonti dalla sezione "Gestione software". La struttura del porto rimane invariata.

---

## 14. Glossario

| Termine | Significato |
| --- | --- |
| Area fisica | Porzione del porto rappresentata sulla pianta (banchina, terminal, varco, area doganale, scanner, ferrovia, nave, impianto) |
| Funzione | Funzione portuale svolta in un'area (fisica, logistica, operativa, di sicurezza, doganale) |
| Attività | Operazione concreta che dà attuazione a una funzione |
| Software | Risorsa applicativa usata per svolgere un'attività: applicativo, sito web, applicazione desktop o documento |
| Associazione | Collegamento tra un software e un nodo della struttura (area, funzione o attività) |
| Fonte | Origine dei dati: un file Excel o CSV, un documento Word oppure l'insieme delle voci inserite manualmente |
| Foglio o sezione | Suddivisione interna di una fonte (foglio di Excel, tabella o paragrafi di un documento Word) |
| Dati grezzi | Contenuto originale della riga importata, conservato integralmente per tracciabilità |
