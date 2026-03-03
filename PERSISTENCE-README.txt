=======================================================
SISTEMA DI PERSISTENZA FILE-BASED
=======================================================

Data implementazione: 01/10/2025
Modifiche applicate a: server.js

FUNZIONALITÀ:
- Salvataggio automatico di users, architects e activationTokens
- Cartella dati: backend/data/
- Files: users.json, architects.json, activation-tokens.json
- Salvataggio sincrono ad ogni modifica (push, splice)

TEST EFFETTUATI:
✅ Creazione file JSON iniziali
✅ Registrazione nuovo utente
✅ Persistenza dopo restart server
✅ Login con utente persistito

BACKUP DISPONIBILE:
- Backup manuale in: pennino copia 2/backup-ordine-architetti-20250101/

ROLLBACK (se necessario):
1. Ferma il server (CTRL+C)
2. Copia il backup su ordine-architetti/
3. Riavvia il server

NOTE:
- I file JSON vengono creati automaticamente all'avvio
- Ogni modifica agli array viene salvata immediatamente
- In caso di errore, i dati vengono caricati da file
=======================================================