// Cria ou redefine a senha de um membro da Banca.
// Uso: BANCA_SENHA='...' node --env-file=.env scripts/criar-usuario-banca.js <email> "<nome>"
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const [email, nome = "Comissão Avaliadora"] = process.argv.slice(2);
const senha = process.env.BANCA_SENHA;
if (!email || !senha || !process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL e BANCA_SENHA e informe o e-mail como argumento.");
  process.exit(1);
}
if (senha.length < 8) {
  console.error("BANCA_SENHA precisa ter ao menos 8 caracteres.");
  process.exit(1);
}

// Mesmo formato de src/domain/auth/senha.ts: scrypt$<salt hex>$<hash hex>
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(senha, salt, 32).toString("hex");

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Banco novo: cria as tabelas (o schema é idempotente)
    await client.query(
      fs.readFileSync(path.join(__dirname, "../src/infrastructure/database/schema.sql"), "utf8")
    );
    await client.query(
      `INSERT INTO usuarios_banca (id, nome, email, senha_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash`,
      [`banca-${crypto.randomUUID()}`, nome, email.toLowerCase().trim(), `scrypt$${salt}$${hash}`]
    );
    console.log(`Usuário da Banca ${email} criado/atualizado.`);
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
