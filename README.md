# Port Control Center

Interfaccia interattiva di gestione e controllo di un porto commerciale: la pianta del porto è il punto di accesso alle funzioni operative, secondo la catena porto → area fisica → funzione → attività → software → operazione.

I software non sono predefiniti: vengono configurati importando file Excel o CSV, documenti Word, indirizzi web e applicazioni desktop.

## Avvio rapido

- Windows: doppio clic su `avvia-windows.cmd`
- macOS, Linux: `./avvia-mac-linux.sh`
- Manuale: `npm install`, `npm run build`, `npm start`, poi `http://localhost:5000`

L'applicazione ascolta solo su `127.0.0.1`. Per l'accesso dalla rete locale: `HOST=0.0.0.0 npm start`.

Senza diritti di amministratore si può usare Node.js 20 in versione portatile (archivio ZIP estratto nella sottocartella `nodejs`) oppure aprire il repository in GitHub Codespaces, dove la porta 5000 è inoltrata in modalità privata.

## Dati

Tutti i dati risiedono nel file `data.db` (SQLite) nella cartella di lavoro. Il file è escluso dal repository: per il backup è sufficiente copiarlo.

## Documentazione

Manuale completo di installazione e utilizzo: `MANUALE.md` e `Manuale-Port-Control-Center.pdf`.
