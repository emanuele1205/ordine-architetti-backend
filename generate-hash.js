const bcrypt = require('bcryptjs');

// Genera hash per la password
const password = 'password123';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\n--- Copia questi hash nel tuo server.js ---\n');

// Genera hash per tutti gli utenti di test
const users = [
  { email: 'mario.rossi@test.it', password: 'password123' },
  { email: 'laura.bianchi@test.it', password: 'password123' },
  { email: 'giuseppe.verdi@test.it', password: 'password123' }
];

users.forEach(user => {
  const userHash = bcrypt.hashSync(user.password, 10);
  console.log(`${user.email}: '${userHash}'`);
});

// Test di verifica
console.log('\n--- Test di verifica ---');
const testHash = bcrypt.hashSync('password123', 10);
console.log('Test password123 matches:', bcrypt.compareSync('password123', testHash));