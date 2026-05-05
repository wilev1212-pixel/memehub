# MemeHub 🔥 — Version communautaire (Supabase)

Toutes les données sont partagées entre tous les utilisateurs via Supabase (PostgreSQL).

---

## Étape 1 — Créer la base Supabase (5 min)

1. Va sur **supabase.com** → créer un compte gratuit
2. **New Project** → choisis un nom et un mot de passe (note-le)
3. Attends ~2 minutes que le projet démarre
4. Va dans **SQL Editor** → colle tout le contenu de `supabase/schema.sql` → **Run**
5. Récupère tes clés dans **Settings → API** :
   - `Project URL` → c'est ta `VITE_SUPABASE_URL`
   - `anon public` key → c'est ta `VITE_SUPABASE_ANON_KEY`

---

## Étape 2 — Pousser sur GitHub

```bash
git init
git add .
git commit -m "feat: MemeHub communautaire avec Supabase"
git branch -M main
git remote add origin https://github.com/TON_PSEUDO/memehub.git
git push -u origin main
```

---

## Étape 3 — Déployer sur Railway

1. Va sur **railway.app** → **New Project → Deploy from GitHub repo**
2. Sélectionne ton repo `memehub`
3. Dans l'onglet **Variables**, ajoute :
   ```
   VITE_SUPABASE_URL     = https://XXXX.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGci...
   ```
4. Railway rebuilde automatiquement
5. **Settings → Networking → Generate Domain** → tu as ton URL publique !

---

## Dev local

```bash
cp .env.example .env.local
# Remplis .env.local avec tes vraies clés Supabase
npm install
npm run dev
```
